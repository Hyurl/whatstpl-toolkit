/** Whether the program is runing in a browser. */
export const IsBrowser = typeof window == "object"
    && typeof XMLHttpRequest == "function";

/** Path separator. */
export const Separator = IsBrowser ? "/" :
    (process.platform == "win32" ? "\\" : "/");

/** Escapes HTML tags. */
export function escape(html: string): string {
    return String(html).replace(/<\/?[^>]*>/g, "");
}

/** Gets the dirname according to the given path. */
export function dirname(path: string): string {
    if (path == "/") return path;

    let i = path.replace(/\\/g, "/").lastIndexOf("/");

    if (i < 0 || path == "/")
        return ".";
    else if (i == path.length - 1)
        return dirname(path.substring(0, i));
    else
        return path.substring(0, i).replace(/\/|\\/g, Separator);
}

/** Gets the basename of a file. */
export function basename(filename: string, extname: string = ""): string {
    let dir = dirname(filename),
        basename = (dir == "./" && filename.match(/^\.[\/\\]/) == null)
            ? filename : filename.substring(dir.length + 1);

    if (extname) {
        let i = basename.lastIndexOf(extname);
        basename = i >= 0 ? basename.substring(0, i) : basename;
    }

    return basename;
}

/** Gets the extension name of a file. */
export function extname(filename: string): string {
    let baseName = basename(filename),
        i = baseName.lastIndexOf(".");
    return i >= 0 ? baseName.substring(i) : "";
}

/** 
 * Normalizes the given path, strips `../` and `./`, and corrects the path
 * separator.
 */
export function normalizePath(path: string): string {
    let parts = path.split(/\/|\\/);

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] == "..") {
            parts.splice(i - 1, 2);
            i -= 2;
        } else if (parts[i] == ".") {
            parts.splice(i, 1);
            i -= 1;
        }
    }

    return parts.join(Separator);
}

/** Gets the current working directory. */
export function getCwd(): string {
    if (IsBrowser) {
        return location.protocol + "//" + location.host
            + dirname(location.pathname);
    } else {
        return process.cwd();
    }
}

/** Checks if the given path is absolute. */
export function isAbsPath(path: string): boolean {
    return path[0] == "/" || path.match(/^[a-zA-Z0-9]+:[\/\\]/) != null;
}

/** Gets the absolute path of a file. */
export function getAbsPath(filename: string): string {
    if (!isAbsPath(filename)) {
        let dir = getCwd(),
            noSep = dir[dir.length - 1] == "/";

        filename = dir + (noSep ? "" : Separator) + filename;
    }

    return normalizePath(filename);
}

/** Gets the values of an object. */
export function getObjectValues(obj: any): any[] {
    let res = [];

    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            res.push(obj[prop]);
    }

    return res;
}

/** 
 * Gets the function body offest, usually to get from a `new Function`, which
 * the function string is platform independent.
 */
export function getFunctionBodyOffset(fn: Function): { line: number, column: number } {
    let fnStr = fn.toString(),
        i = fnStr.indexOf("{") + 1,
        defArr = fnStr.slice(0, i).split("\n"),
        inNewLine = fnStr[i] == "\n",
        column = inNewLine ? 0 : defArr[defArr.length - 1].indexOf("{") + 2,
        line = inNewLine ? defArr.length : defArr.length - 1;

    return { line, column };
}