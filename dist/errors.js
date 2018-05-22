"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var UnclosedTagError = (function (_super) {
    tslib_1.__extends(UnclosedTagError, _super);
    function UnclosedTagError(message, filename, line, column) {
        var _this = _super.call(this, message) || this;
        _this.filename = filename;
        _this.line = line;
        _this.column = column;
        return _this;
    }
    return UnclosedTagError;
}(SyntaxError));
exports.UnclosedTagError = UnclosedTagError;
//# sourceMappingURL=errors.js.map