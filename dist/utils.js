"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsBrowser = typeof window == "object"
    && typeof XMLHttpRequest == "function";
exports.Separator = exports.IsBrowser ? "/" :
    (process.platform == "win32" ? "\\" : "/");
function escape(html) {
    return String(html).replace(/<\/?[^>]*>/g, "");
}
exports.escape = escape;
function dirname(path) {
    if (path == "/")
        return path;
    let i = path.replace(/\\/g, "/").lastIndexOf("/");
    if (i < 0 || path == "/")
        return ".";
    else if (i == path.length - 1)
        return dirname(path.substring(0, i));
    else
        return path.substring(0, i).replace(/\/|\\/g, exports.Separator);
}
exports.dirname = dirname;
function basename(filename, extname = "") {
    let dir = dirname(filename), basename = (dir == "./" && filename.match(/^\.[\/\\]/) == null)
        ? filename : filename.substring(dir.length + 1);
    if (extname) {
        let i = basename.lastIndexOf(extname);
        basename = i >= 0 ? basename.substring(0, i) : basename;
    }
    return basename;
}
exports.basename = basename;
function extname(filename) {
    let baseName = basename(filename), i = baseName.lastIndexOf(".");
    return i >= 0 ? baseName.substring(i) : "";
}
exports.extname = extname;
function normalizePath(path) {
    let parts = path.split(/\/|\\/);
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] == "..") {
            parts.splice(i - 1, 2);
            i -= 2;
        }
        else if (parts[i] == ".") {
            parts.splice(i, 1);
            i -= 1;
        }
    }
    return parts.join(exports.Separator);
}
exports.normalizePath = normalizePath;
function getCwd() {
    if (exports.IsBrowser) {
        return location.protocol + "//" + location.host
            + dirname(location.pathname);
    }
    else {
        return process.cwd();
    }
}
exports.getCwd = getCwd;
function isAbsPath(path) {
    return path[0] == "/" || path.match(/^[a-zA-Z0-9]+:[\/\\]/) != null;
}
exports.isAbsPath = isAbsPath;
function getAbsPath(filename) {
    if (!isAbsPath(filename)) {
        let dir = getCwd(), noSep = dir[dir.length - 1] == "/";
        filename = dir + (noSep ? "" : exports.Separator) + filename;
    }
    return normalizePath(filename);
}
exports.getAbsPath = getAbsPath;
function getObjectValues(obj) {
    let res = [];
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            res.push(obj[prop]);
    }
    return res;
}
exports.getObjectValues = getObjectValues;
function getFunctionBodyOffset(fn) {
    let fnStr = fn.toString(), i = fnStr.indexOf("{") + 1, defArr = fnStr.slice(0, i).split("\n"), inNewLine = fnStr[i] == "\n", column = inNewLine ? 0 : defArr[defArr.length - 1].indexOf("{") + 2, line = inNewLine ? defArr.length : defArr.length - 1;
    return { line, column };
}
exports.getFunctionBodyOffset = getFunctionBodyOffset;
//# sourceMappingURL=utils.js.map