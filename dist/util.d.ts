export declare const IsBrowser: boolean;
export declare const Separator: string;
export declare function escape(html: string): string;
export declare function dirname(path: string): string;
export declare function basename(filename: string, extname?: string): string;
export declare function extname(filename: string): string;
export declare function normalizePath(path: string): string;
export declare function getCwd(): string;
export declare function isAbsPath(path: string): boolean;
export declare function getAbsPath(filename: string): string;
export declare function getObjectValues(obj: any): any[];
export declare function getFunctionBodyOffset(fn: Function): {
    line: number;
    column: number;
};
