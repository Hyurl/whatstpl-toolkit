export declare class UnclosedTagError extends SyntaxError {
    filename: string;
    line: number;
    column: number;
    constructor(message: string, filename: string, line: number, column: number);
}
