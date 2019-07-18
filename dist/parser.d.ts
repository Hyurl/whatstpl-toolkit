import { Node } from "./interfaces";
export declare class Parser {
    readonly filename: string;
    readonly nodes: Node[];
    private html;
    private listeners;
    private outputTags;
    private blockTags;
    private regexp;
    static readonly EngineName = "whatstpl";
    static BlockTags: string[];
    static OutputTags: string[];
    constructor(filename?: string);
    private renewRegExp;
    on(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): boolean;
    parse(html: string): Node;
    private getLine;
    private attachTextNode;
    private parseHtml;
    private applyAttr;
    private parseComment;
}
