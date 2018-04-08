"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const utils_1 = require("./utils");
const AttrRe = /([0-9a-zA-Z:\-]+)\s*=\s*|([0-9a-zA-Z:\-]+)\s*/;
class Parser {
    constructor(filename = "") {
        this.listeners = {};
        this.outputTags = Parser.OutputTags;
        this.blockTags = Parser.BlockTags;
        if (filename)
            this.filename = utils_1.getAbsPath(filename);
        else
            this.filename = "undefined";
        this.renewRegExp();
        this.on("block", (node) => {
            let attrs = node.attributes;
            if (node.tag == "block") {
                this.blockTags.push(attrs.name.value);
                this.renewRegExp();
            }
            else if (node.tag == "import" && attrs.target && attrs.target.value) {
                let tags = attrs.target.value.split(/,\s*/);
                for (let i in tags) {
                    let pair = tags[i].split(/\s+as\s+/);
                    tags[i] = pair[1] || pair[0];
                }
                this.blockTags = this.blockTags.concat(tags);
                this.renewRegExp();
            }
        });
    }
    renewRegExp() {
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
    on(event, listener) {
        if (!this.listeners[event])
            this.listeners[event] = [];
        this.listeners[event].push(listener);
    }
    emit(event, ...args) {
        if (!this.listeners[event] || !this.listeners[event].length)
            return false;
        for (let listener of this.listeners[event]) {
            listener(...args);
        }
        return true;
    }
    parse(html) {
        let root = {
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
    getLine(html, line) {
        let lineStr, left;
        while (true) {
            let end = html.indexOf("\n");
            lineStr = (end >= 0 ? html.substring(0, end) : html).trimRight();
            left = end >= 0 ? html.substring(end + 1) : "";
            if (lineStr || !left) {
                break;
            }
            else {
                line += 1;
                html = left;
            }
        }
        return { lineStr, left, line };
    }
    attachTextNode(lineStr, line, column, endIndex, nodes) {
        let textNode = {
            type: "text",
            line,
            column,
            contents: endIndex ? lineStr.substring(0, endIndex) : lineStr + "\n",
            closed: true,
        };
        if (textNode.contents.trimLeft()) {
            nodes.push(textNode);
            this.emit("text", textNode);
        }
    }
    parseHtml(html, line, column = 1, parent) {
        let LineInfo = this.getLine(html, line), lineStr = LineInfo.lineStr, matches = lineStr.match(this.regexp), nodes = parent.contents;
        html = LineInfo.left;
        line = LineInfo.line;
        if (!matches) {
            if (parent.tag == "script"
                && parent.attributes.engine
                && parent.attributes.engine.value == Parser.EngineName) {
                let snippetNode = {
                    type: "snippet",
                    line,
                    column,
                    contents: lineStr + "\n",
                    closed: true,
                };
                nodes.push(snippetNode);
                this.emit("snippet", snippetNode);
            }
            else {
                this.attachTextNode(lineStr, line, column, NaN, nodes);
            }
            line += 1;
            column = 1;
        }
        else if (matches[1] && parent.tag != "script") {
            if (matches.index) {
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
                column += matches.index;
            }
            let left = lineStr.substring(matches.index + matches[0].length), commentNode = {
                type: "comment",
                line,
                column,
                contents: matches[0],
                closed: false
            };
            nodes.push(commentNode);
            this.emit("comment", commentNode);
            if (left) {
                html = left + "\n" + html;
                column += matches[0].length;
            }
            else {
                commentNode.contents += "\n";
                line += 1;
                column = 1;
            }
        }
        else if (matches[2] && parent.tag != "script") {
            if (matches.index) {
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
                column += matches.index;
            }
            let commentNode = {
                type: "comment",
                line,
                column,
                contents: lineStr.substring(matches.index),
                closed: false
            };
            line += 1;
            column = 1;
            let res = this.parseComment(html, line, column, commentNode);
            nodes.push(commentNode);
            this.emit("comment", commentNode);
            html = res.left;
            line = res.line;
            column = res.column;
        }
        else if (matches[3] && matches[4]) {
            if (matches.index) {
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
                column += matches.index;
            }
            column += 2;
            let varNode = {
                tag: matches[3],
                type: "var",
                line,
                column,
                contents: matches[4],
                closed: true,
            };
            nodes.push(varNode);
            this.emit("var", varNode);
            let endColumn = matches.index + matches[4].length + 3, left = lineStr.substring(endColumn);
            if (left.trimRight()) {
                html = left + (html ? "\n" + html : "");
                column += matches[4].length + 1;
            }
            else {
                line += 1;
                column = 1;
            }
        }
        else if (matches[5] && parent.tag != "script") {
            if (matches.index) {
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
                column += matches.index;
            }
            let endColumn = matches.index + matches[0].length, ending = lineStr[endColumn - 1], blockNode = {
                tag: matches[5],
                type: "block",
                line,
                column,
                attributes: {},
                contents: [],
                closed: false,
            };
            if (ending == "/" || ending == ">")
                endColumn -= 1;
            let left = lineStr.substring(endColumn);
            if (!left && html) {
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
            }
            else {
                throw new errors_1.UnclosedTagError("unclosed tag", this.filename, line, column);
            }
            let res = this.applyAttr(html, line, column, blockNode.attributes);
            blockNode.closed = res.blockClosed;
            if (res.left && !blockNode.closed) {
                res = this.parseHtml(res.left, res.line, res.column, blockNode);
            }
            nodes.push(blockNode);
            this.emit("block", blockNode);
            html = res.left;
            line = res.line;
            column = res.column;
        }
        else if (matches[6] && matches[6] == parent.tag) {
            if (matches.index && parent.tag != "script") {
                this.attachTextNode(lineStr, line, column, matches.index, nodes);
            }
            parent.closed = true;
            let endColumn = matches.index + matches[0].length, left = lineStr.substring(endColumn);
            if (left) {
                html = left + (html ? "\n" + html : "");
                column += endColumn;
            }
            else {
                line += 1;
                column = 1;
            }
        }
        else {
            this.attachTextNode(lineStr, line, column, NaN, nodes);
            line += 1;
            column = 1;
        }
        if (html && !parent.closed) {
            return this.parseHtml(html, line, column, parent);
        }
        else {
            parent.closed = true;
            return { line, column, left: html };
        }
    }
    applyAttr(html, line, column, attrs) {
        let LineInfo = this.getLine(html, line), lineStr = LineInfo.lineStr, matches = lineStr.match(AttrRe);
        line = LineInfo.line;
        html = LineInfo.left;
        if (!matches) {
            let i = lineStr.indexOf(">");
            if (i === -1) {
                throw new errors_1.UnclosedTagError("unclosed tag", this.filename, line, column);
            }
            else {
                column += i + 1;
                let left = lineStr.substring(i + 1);
                if (left) {
                    html = left + "\n" + html;
                }
                else {
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
        let name;
        let value;
        let noQuote = true;
        let ending;
        let blockClosed;
        let left;
        if (matches[1]) {
            let pos = matches.index + matches[0].length, quote = lineStr[pos], end;
            noQuote = quote != "'" && quote != '"';
            if (!noQuote)
                pos += 1;
            if (!noQuote) {
                end = lineStr.indexOf(quote, pos);
            }
            else {
                end = lineStr.indexOf("/", pos);
                if (end === -1)
                    end = lineStr.indexOf(">", pos);
            }
            name = matches[1],
                value = end === -1 ? "" : lineStr.substring(pos, end);
            left = lineStr.substring(end + 1);
            column += pos;
        }
        else if (matches[2]) {
            name = value = matches[2].trim();
            left = lineStr.substring(matches.index + matches[0].length);
            column += matches.index;
        }
        ending = left ? left.trimLeft()[0] : "";
        blockClosed = ending == "/";
        attrs[name] = { name, value, line, column };
        if (ending == "/")
            left = left.substring(2);
        else if (ending == ">")
            left = left.substring(1);
        if (left) {
            html = left + "\n" + html;
            column += (matches[1] ? value.length : matches[0].length)
                + (noQuote ? 0 : 1);
        }
        else {
            line += 1;
            column = 1;
        }
        if (!ending || (ending != ">" && ending != "/")) {
            return this.applyAttr(html, line, column, attrs);
        }
        else {
            let i;
            if (ending == ">")
                i = left.indexOf(">") + 1;
            else if (ending == "/")
                i = left.indexOf("/>") + 2;
            column += i;
            return { line, column, left: html, blockClosed };
        }
    }
    parseComment(html, line, column, commentNode) {
        let LineInfo = this.getLine(html, line), lineStr = LineInfo.lineStr, matches = lineStr && lineStr.match(/-->/);
        line = LineInfo.line;
        html = LineInfo.left;
        if (lineStr)
            commentNode.contents += "\n";
        if (!matches) {
            commentNode.contents += lineStr;
            line += 1;
            column = 1;
            if (html) {
                return this.parseComment(html, line, column, commentNode);
            }
            else {
                return { line, column, left: html };
            }
        }
        else {
            if (matches.index) {
                commentNode.contents += lineStr.substring(0, matches.index);
            }
            commentNode.contents += matches[0];
            commentNode.closed = true;
            column += matches.index + 3;
            let left = lineStr.substring(column);
            if (left) {
                html = left + "\n" + html;
            }
            else {
                line += 1;
                column = 1;
            }
        }
        return { line, column, left: html };
    }
}
Parser.EngineName = "whatstpl";
Parser.BlockTags = [
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
    "do",
    "continue",
    "break",
    "script",
];
Parser.OutputTags = [
    "!",
    "@",
    "#",
];
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map