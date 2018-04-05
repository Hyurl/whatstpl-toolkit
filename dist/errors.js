"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UnclosedTagError extends SyntaxError {
    constructor(message, filename, line, column) {
        super(message);
        this.filename = filename;
        this.line = line;
        this.column = column;
    }
}
exports.UnclosedTagError = UnclosedTagError;
//# sourceMappingURL=errors.js.map