export interface Node {
    tag?: string;
    type: "root" | "text" | "var" | "block" | "comment" | "snippet";
    line: number;
    column: number;
    attributes?: { [name: string]: Attribute };
    contents: string | Node[];
    closed?: boolean;
}

export interface Attribute {
    name: string;
    value: string;
    line: number;
    column: number;
}