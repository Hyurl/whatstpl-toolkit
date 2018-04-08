import { Node } from "./interfaces";
export declare class Parser {
    readonly filename: string;
    readonly nodes: Node[];
    private html;
    private listeners;
    private outputTags;
    private blockTags;
    private regexp;
    static readonly EngineName: string;
    static BlockTags: string[];
    static OutputTags: string[];
    constructor(filename?: string);
    private renewRegExp();
    on(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): boolean;
    parse(html: string): Node;
    private getLine(html, line);
    private attachTextNode(lineStr, line, column, endIndex, nodes);
    private parseHtml(html, line, column, parent);
    private applyAttr(html, line, column, attrs);
    private parseComment(html, line, column, commentNode);
}
