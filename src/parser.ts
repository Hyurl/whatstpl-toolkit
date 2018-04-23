import { Node, Attribute } from "./interfaces";
import { UnclosedTagError } from "./errors";
import { getCwd, getAbsPath } from "./utils";

const AttrRe = /([0-9a-zA-Z:\-]+)\s*=\s*|([0-9a-zA-Z:\-]+)\s*/;

/** Parser for **whatstpl** template. */
export class Parser {
    readonly filename: string;
    readonly nodes: Node[];

    private html: string;
    private listeners: { [event: string]: Array<(...args) => void> } = {};
    private outputTags: string[] = Parser.OutputTags;
    private blockTags: string[] = Parser.BlockTags;
    private regexp: RegExp;

    static readonly EngineName = "whatstpl";
    static BlockTags: string[] = [
        "layout",
        "import",
        "export",
        "block",
        "if",
        "else-if",
        "else",
        "switch",
        "case",
        "default",
        "for",
        "while",
        "do", // do... while...
        "continue",
        "break",
        "script",
    ];
    static OutputTags: string[] = [
        "!", // no output
        "@", // raw output
        "#", // escaped output
    ];

    constructor(filename: string = "") {
        if (filename)
            this.filename = getAbsPath(filename);
        else
            this.filename = "undefined";

        this.renewRegExp();

        // When passing '<block>' tag, push the user-defined block tags and
        // imported tags into tag list.
        this.on("block", (node: Node) => {
            let attrs = node.attributes;

            if (node.tag == "block") {
                this.blockTags.push(attrs.name.value);
                this.renewRegExp();
            } else if (node.tag == "import" && attrs.target && attrs.target.value) {
                // Importing user-defined blocks from another template.
                let tags = attrs.target.value.split(/,\s*/);

                for (let i in tags) {
                    // allow 'as' syntax
                    let pair = tags[i].split(/\s+as\s+/);
                    tags[i] = pair[1] || pair[0];
                }

                this.blockTags = this.blockTags.concat(tags);
                this.renewRegExp();
            }
        });
    }

    /** Renews the internal `regexp` that used to match tags and blocks. */
    private renewRegExp() {
        let tagStr = this.blockTags.join("|");
        let pattern = "<!--(.*?)-->|<!--(.*)|("
            + this.outputTags.join("|")
            + ")\{(.+?)\}|<("
            + tagStr
            + ")[\\s|\\/|>]|<\\/("
            + tagStr
            + ")>";

        this.regexp = new RegExp(pattern);
    }

    on(event: string, listener: (...args: any[]) => void) {
        if (!this.listeners[event])
            this.listeners[event] = [];

        this.listeners[event].push(listener);
    }

    emit(event: string, ...args): boolean {
        if (!this.listeners[event] || !this.listeners[event].length)
            return false;

        for (let listener of this.listeners[event]) {
            listener(...args);
        }

        return true;
    }

    /** Parses the template in HTML format. */
    parse(html: string): Node {
        let root: Node = {
            tag: "root",
            type: "root",
            line: 1,
            column: 1,
            contents: [],
            closed: false
        };
        this.html = html.trimRight().replace(/\r\n|\r/g, "\n");
        this.parseHtml(this.html, 1, 1, root);
        return root;
    }

    /** Gets a line of string in the HTML. */
    private getLine(html: string, line: number): {
        lineStr: string;
        /** remaining HTML contents. */
        left: string;
        line: number;
    } {
        let lineStr: string, left: string;

        // searching until a non-empty line is found.
        while (true) {
            let end = html.indexOf("\n");

            lineStr = (end >= 0 ? html.substring(0, end) : html).trimRight();
            left = end >= 0 ? html.substring(end + 1) : "";

            if (lineStr || !left) {
                break;
            } else {
                line += 1;
                html = left;
            }
        }

        return { lineStr, left, line };
    }

    private attachTextNode(
        lineStr: string,
        line: number,
        column: number,
        endIndex: number,
        nodes: Node[],
        keepPureSpaces: boolean = false
    ) {
        let textNode: Node = {
            type: "text",
            line,
            column,
            contents: endIndex ? lineStr.substring(0, endIndex) : lineStr + "\n",
            closed: true,
        };

        if (keepPureSpaces || (<string>textNode.contents).trimLeft()) {
            nodes.push(textNode);
            this.emit("text", textNode); // emit 'text' event.
        }
    }

    private parseHtml(html: string, line: number, column: number = 1, parent: Node): {
        /** the current line number of the remaining HTML contents. */
        line: number;
        /** the current column number of the remaining HTML contents. */
        column: number;
        /** remaining HTML contents. */
        left: string;
    } {
        let LineInfo = this.getLine(html, line),
            lineStr = LineInfo.lineStr,
            matches = lineStr.match(this.regexp),
            nodes = <Node[]>parent.contents;

        // remaining HTML contents.
        html = LineInfo.left;
        line = LineInfo.line;

        if (!matches) { // matches plain text.
            if (parent.tag == "script"
                && parent.attributes.engine
                && parent.attributes.engine.value == Parser.EngineName) {
                let snippetNode: Node = {
                    type: "snippet",
                    line,
                    column,
                    contents: lineStr + "\n",
                    closed: true,
                };

                nodes.push(snippetNode);
                this.emit("snippet", snippetNode); // emit 'text' event.
            } else {
                this.attachTextNode(lineStr, line, column, NaN, nodes);
            }
            line += 1;
            column = 1;
        } else if (matches[1] && parent.tag != "script") { // matches complete comment.
            if (matches.index) { // has plain text before the comment.
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
                column += matches.index;
            }

            let left = lineStr.substring(matches.index + matches[0].length),
                commentNode: Node = {
                    type: "comment",
                    line,
                    column,
                    contents: matches[0], // include <!-- and -->,
                    closed: false
                };

            nodes.push(commentNode);
            this.emit("comment", commentNode);

            if (left) {
                html = left + "\n" + html;
                column += matches[0].length;
            } else {
                commentNode.contents += "\n";
                line += 1;
                column = 1;
            }
        } else if (matches[2] && parent.tag != "script") { // matches incomplete comment.
            if (matches.index) { // has plain text before the comment.
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
                column += matches.index;
            }

            let commentNode: Node = {
                type: "comment",
                line,
                column,
                contents: lineStr.substring(matches.index), // include <!--
                closed: false
            }

            line += 1;
            column = 1;

            let res = this.parseComment(html, line, column, commentNode);

            nodes.push(commentNode);
            this.emit("comment", commentNode);

            html = res.left;
            line = res.line;
            column = res.column;
        } else if (matches[3] && matches[4]) { // matches output statement.
            if (matches.index) { // has plain text before output statement.
                this.attachTextNode(lineStr, line, column, matches.index, nodes, matches[3] != "!");
                column += matches.index;
            }

            // column number in an output statement is the position after '{'.
            column += 2;

            let varNode: Node = {
                tag: matches[3], // !, @, #
                type: "var",
                line,
                column,
                contents: matches[4],
                closed: true,
            };

            nodes.push(varNode);
            this.emit("var", varNode);

            // end-column number in an output statement is the position after '}'.
            let endColumn = matches.index + matches[4].length + 3,
                left = lineStr.substring(endColumn); // text after output statement.

            if (left.trimRight()) {
                html = left + (html ? "\n" + html : "");
                column += matches[4].length + 1;
            } else {
                line += 1;
                column = 1;
            }
        } else if (matches[5] && parent.tag != "script") { //matches block statement.
            if (matches.index) {  // has plain text before block tag.
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
                column += matches.index;
            }

            let endColumn = matches.index + matches[0].length,
                ending = lineStr[endColumn - 1],
                blockNode: Node = {
                    tag: matches[5],
                    type: "block",
                    line,
                    column,
                    attributes: {},
                    contents: [],
                    closed: false,
                }

            if (ending == "/" || ending == ">")
                endColumn -= 1;

            let left = lineStr.substring(endColumn); // text after output statement.

            if (!left && html) {
                // If no attribute string presents in the current line, then 
                // try to get it from a new line, thus the column number is 
                // reset to 1.
                column = 1;

                let LineInfo = this.getLine(html, line);
                if (LineInfo.lineStr) {
                    left = LineInfo.lineStr;
                    html = LineInfo.left;
                }
            }

            if (left) {
                html = left + (html ? "\n" + html : "");
                column += matches[0].length;
            } else {
                // When searched to the last line and the tag has been been 
                // closed, an error will be throw.
                throw new UnclosedTagError("unclosed tag", this.filename, line, column);
            }

            // apply attributes.
            let res = this.applyAttr(html, line, column, blockNode.attributes);

            blockNode.closed = res.blockClosed;

            if (res.left && !blockNode.closed) { // parse children blocks.
                res = <any>this.parseHtml(res.left, res.line, res.column, blockNode);
            }

            nodes.push(blockNode);
            this.emit("block", blockNode);

            html = res.left;
            line = res.line;
            column = res.column;
        } else if (matches[6] && matches[6] == parent.tag) { // matches close tag.
            if (matches.index && parent.tag != "script") {  // has plain text before block close tag.
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
            }

            parent.closed = true;

            // end-column number after close tag.
            let endColumn = matches.index + matches[0].length,
                left = lineStr.substring(endColumn); // text after output statement.

            if (left) {
                html = left + (html ? "\n" + html : "");
                column += endColumn;
            } else {
                line += 1;
                column = 1;
            }
        } else { // matches plain text.
            this.attachTextNode(lineStr, line, column, NaN, nodes);
            line += 1;
            column = 1;
        }

        if (html && !parent.closed) { // recursively parse the remaining HTML.
            return this.parseHtml(html, line, column, parent);
        } else {
            parent.closed = true;
            return { line, column, left: html };
        }
    }

    private applyAttr(html: string, line: number, column: number, attrs: {
        [name: string]: Attribute
    }): {
            /** the current line number of the remaining HTML contents. */
            line: number;
            /** the current column number of the remaining HTML contents. */
            column: number;
            /** remaining HTML contents. */
            left: string;
            /** Whether the current block if self-closed. */
            blockClosed: boolean;
        } {
        let LineInfo = this.getLine(html, line),
            lineStr = LineInfo.lineStr,
            matches = lineStr.match(AttrRe);

        line = LineInfo.line;
        html = LineInfo.left;

        if (!matches) { // no attribute matches.
            let i = lineStr.indexOf(">");

            if (i === -1) {
                // When searched to the last line and the tag has been been 
                // closed, an error will be throw.
                throw new UnclosedTagError("unclosed tag", this.filename, line, column);
            } else {
                column += i + 1;

                let left = lineStr.substring(i + 1);

                if (left) {
                    html = left + "\n" + html;
                } else {
                    line += 1;
                    column = 1;
                }
            }

            return {
                line,
                column,
                left: html,
                blockClosed: lineStr[i - 1] == "/"
            };
        }

        let name: string;
        let value: string;
        let noQuote: boolean = true;
        let ending: string;
        let blockClosed: boolean;
        let left: string; // remaining text in the line
        let leftIndex: number = 0;

        if (matches[1]) { // match name="value" style
            let pos = matches.index + matches[0].length, // position of quote mark
                quote = lineStr[pos],
                end: number;

            noQuote = quote != "'" && quote != '"';

            if (!noQuote)
                pos += 1;

            if (!noQuote) {
                end = lineStr.indexOf(quote, pos);
            } else {
                end = lineStr.indexOf("/", pos);
                if (end === -1)
                    end = lineStr.indexOf(">", pos);
            }

            name = matches[1], // attribute name
                value = end === -1 ? "" : lineStr.substring(pos, end);
            left = lineStr.substring(end + 1);
            column += pos;
        } else if (matches[2]) { // matches short-hand (name is value) style.
            name = value = matches[2].trim();
            left = lineStr.substring(matches.index + matches[0].length);
            column += matches.index;
        }

        ending = left ? left.trimLeft()[0] : "";
        blockClosed = ending == "/";
        attrs[name] = { name, value, line, column };

        if (ending == "/") // match '/>'
            leftIndex = left.indexOf("/>") + 2;
        else if (ending == ">") // match '>'
            leftIndex = left.indexOf("/>") + 1;

        if (leftIndex)
            left = left.substring(leftIndex);

        if (left) {
            html = left + "\n" + html;
            column += (matches[1] ? value.length : matches[0].length)
                + (noQuote ? 0 : 1);
        } else {
            line += 1;
            column = 1;
        }

        if (!ending || (ending != ">" && ending != "/")) {
            // Attributes parsing not complete, recursively parse the 
            // remaining HTML.
            return this.applyAttr(html, line, column, attrs);
        } else { // parsing complete.
            if (left)
                column += leftIndex;
                
            return { line, column, left: html, blockClosed };
        }
    }

    private parseComment(html: string, line: number, column: number, commentNode: Node): {
        /** the current line number of the remaining HTML contents. */
        line: number;
        /** the current column number of the remaining HTML contents. */
        column: number;
        /** remaining HTML contents. */
        left: string;
    } {
        let LineInfo = this.getLine(html, line),
            lineStr = LineInfo.lineStr,
            matches = lineStr && lineStr.match(/-->/);

        line = LineInfo.line;
        html = LineInfo.left;

        if (lineStr)
            commentNode.contents += "\n";

        if (!matches) { // matches comment contents, but not at the end.
            commentNode.contents += lineStr;
            line += 1;
            column = 1;

            if (html) {
                return this.parseComment(html, line, column, commentNode);
            } else {
                return { line, column, left: html };
            }
        } else {
            if (matches.index) { // has comment contents before the close tag.
                commentNode.contents += lineStr.substring(0, matches.index);
            }

            commentNode.contents += matches[0]; // include -->
            commentNode.closed = true;
            column += matches.index + 3;

            let left = lineStr.substring(column);

            if (left) {
                html = left + "\n" + html;
            } else {
                line += 1;
                column = 1;
            }
        }

        return { line, column, left: html };
    }
}