export class UnclosedTagError extends SyntaxError {
    filename: string;
    line: number;
    column: number;

    constructor(message: string, filename: string, line: number, column: number) {
        super(message);
        this.filename = filename;
        this.line = line;
        this.column = column;
    }
}