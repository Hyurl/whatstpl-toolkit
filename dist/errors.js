"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var UnclosedTagError = (function (_super) {
    __extends(UnclosedTagError, _super);
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