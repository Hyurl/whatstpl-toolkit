"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("./errors");
var util_1 = require("./util");
var AttrRe = /([0-9a-zA-Z:\-]+)\s*=\s*|([0-9a-zA-Z:\-]+)\s*/;
var Parser = (function () {
    function Parser(filename) {
        if (filename === void 0) { filename = ""; }
        var _this = this;
        this.listeners = {};
        this.outputTags = Parser.OutputTags;
        this.blockTags = Parser.BlockTags;
        if (filename)
            this.filename = util_1.getAbsPath(filename);
        else
            this.filename = "undefined";
        this.renewRegExp();
        this.on("block", function (node) {
            var attrs = node.attributes;
            if (node.tag == "block") {
                _this.blockTags.push(attrs.name.value);
                _this.renewRegExp();
            }
            else if (node.tag == "import" && attrs.target && attrs.target.value) {
                var tags = attrs.target.value.split(/,\s*/);
                for (var i in tags) {
                    var pair = tags[i].split(/\s+as\s+/);
                    tags[i] = pair[1] || pair[0];
                }
                _this.blockTags = _this.blockTags.concat(tags);
                _this.renewRegExp();
            }
        });
    }
    Parser.prototype.renewRegExp = function () {
        var tagStr = this.blockTags.join("|");
        var pattern = "<!--(.*?)-->|<!--(.*)|("
            + this.outputTags.join("|")
            + ")\{(.+?)\}|<("
            + tagStr
            + ")[\\s|\\/|>]|<\\/("
            + tagStr
            + ")>";
        this.regexp = new RegExp(pattern);
    };
    Parser.prototype.on = function (event, listener) {
        if (!this.listeners[event])
            this.listeners[event] = [];
        this.listeners[event].push(listener);
    };
    Parser.prototype.emit = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.listeners[event] || !this.listeners[event].length)
            return false;
        for (var _a = 0, _b = this.listeners[event]; _a < _b.length; _a++) {
            var listener = _b[_a];
            listener.apply(void 0, args);
        }
        return true;
    };
    Parser.prototype.parse = function (html) {
        var root = {
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
    };
    Parser.prototype.getLine = function (html, line) {
        var lineStr, left;
        while (true) {
            var end = html.indexOf("\n");
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
        return { lineStr: lineStr, left: left, line: line };
    };
    Parser.prototype.attachTextNode = function (lineStr, line, column, endIndex, nodes, keepPureSpaces) {
        if (keepPureSpaces === void 0) { keepPureSpaces = false; }
        var textNode = {
            type: "text",
            line: line,
            column: column,
            contents: endIndex ? lineStr.substring(0, endIndex) : lineStr + "\n",
            closed: true,
        };
        if (keepPureSpaces || textNode.contents.trimLeft()) {
            nodes.push(textNode);
            this.emit("text", textNode);
        }
    };
    Parser.prototype.parseHtml = function (html, line, column, parent) {
        if (column === void 0) { column = 1; }
        var LineInfo = this.getLine(html, line), lineStr = LineInfo.lineStr, matches = lineStr.match(this.regexp), nodes = parent.contents;
        html = LineInfo.left;
        line = LineInfo.line;
        if (!matches) {
            if (parent.tag == "script"
                && parent.attributes.engine
                && parent.attributes.engine.value == Parser.EngineName) {
                var snippetNode = {
                    type: "snippet",
                    line: line,
                    column: column,
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
            var left = lineStr.substring(matches.index + matches[0].length), commentNode = {
                type: "comment",
                line: line,
                column: column,
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
            var commentNode = {
                type: "comment",
                line: line,
                column: column,
                contents: lineStr.substring(matches.index),
                closed: false
            };
            line += 1;
            column = 1;
            var res = this.parseComment(html, line, column, commentNode);
            nodes.push(commentNode);
            this.emit("comment", commentNode);
            html = res.left;
            line = res.line;
            column = res.column;
        }
        else if (matches[3] && matches[4]) {
            if (matches.index) {
                this.attachTextNode(lineStr, line, column, matches.index, nodes, matches[3] != "!");
                column += matches.index;
            }
            column += 2;
            var varNode = {
                tag: matches[3],
                type: "var",
                line: line,
                column: column,
                contents: matches[4],
                closed: true,
            };
            nodes.push(varNode);
            this.emit("var", varNode);
            var endColumn = matches.index + matches[4].length + 3, left = lineStr.substring(endColumn);
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
            var endColumn = matches.index + matches[0].length, ending = lineStr[endColumn - 1], tagClosed = ending == "/" || ending == ">", blockNode = {
                tag: matches[5],
                type: "block",
                line: line,
                column: column,
                attributes: {},
                contents: [],
                closed: false,
            };
            if (tagClosed)
                endColumn -= 1;
            var left = lineStr.substring(endColumn);
            if (!left && html) {
                column = 1;
                var LineInfo_1 = this.getLine(html, line);
                if (LineInfo_1.lineStr) {
                    left = LineInfo_1.lineStr;
                    html = LineInfo_1.left;
                }
            }
            if (left) {
                html = left + (html ? "\n" + html : "");
                column += matches[0].length;
                if (tagClosed)
                    column -= 1;
            }
            else {
                throw new errors_1.UnclosedTagError("unclosed tag", this.filename, line, column);
            }
            var res = this.applyAttr(html, line, column, blockNode.attributes);
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
            var endColumn = matches.index + matches[0].length, left = lineStr.substring(endColumn);
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
            return { line: line, column: column, left: html };
        }
    };
    Parser.prototype.applyAttr = function (html, line, column, attrs) {
        var LineInfo = this.getLine(html, line), lineStr = LineInfo.lineStr, leading = lineStr.trimLeft()[0], tagClosed = leading == "/" || leading == ">", matches = tagClosed ? null : lineStr.match(AttrRe);
        line = LineInfo.line;
        html = LineInfo.left;
        if (!matches) {
            var i = lineStr.indexOf(">");
            if (i === -1) {
                throw new errors_1.UnclosedTagError("unclosed tag", this.filename, line, column);
            }
            else {
                column += i + 1;
                var left_1 = lineStr.substring(i + 1);
                if (left_1) {
                    html = left_1 + "\n" + html;
                }
                else {
                    line += 1;
                    column = 1;
                }
            }
            return {
                line: line,
                column: column,
                left: html,
                blockClosed: leading == "/"
            };
        }
        var name;
        var value;
        var quoted = true;
        var left;
        if (matches[1]) {
            var pos = matches.index + matches[0].length, quote = lineStr[pos], end = void 0;
            quoted = quote == "'" || quote == '"';
            if (quoted)
                pos += 1;
            if (quoted) {
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
        attrs[name] = { name: name, value: value, line: line, column: column };
        if (left) {
            html = left + "\n" + html;
            column += (matches[1] ? value.length : matches[0].length);
            column += (quoted ? 1 : 0);
        }
        else {
            line += 1;
            column = 1;
        }
        return this.applyAttr(html, line, column, attrs);
    };
    Parser.prototype.parseComment = function (html, line, column, commentNode) {
        var LineInfo = this.getLine(html, line), lineStr = LineInfo.lineStr, matches = lineStr && lineStr.match(/-->/);
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
                return { line: line, column: column, left: html };
            }
        }
        else {
            if (matches.index) {
                commentNode.contents += lineStr.substring(0, matches.index);
            }
            commentNode.contents += matches[0];
            commentNode.closed = true;
            column += matches.index + 3;
            var left = lineStr.substring(column);
            if (left) {
                html = left + "\n" + html;
            }
            else {
                line += 1;
                column = 1;
            }
        }
        return { line: line, column: column, left: html };
    };
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
    return Parser;
}());
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map