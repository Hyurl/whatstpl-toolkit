var fs = require("fs");
var toolkit = require("../");
var assert = require("assert");

describe("Parser.prototype.parse(html?: string)", function () {
    it("should parse and generate object as expected", function () {
        var filename = __dirname + "/example.html";
        var parser = new toolkit.Parser(filename);
        var node = parser.parse(fs.readFileSync(filename, "utf8"));
        var expected = require("./example.json");

        assert.deepStrictEqual(node, expected);
    });
});

describe("escape(html: string): string", function () {
    it("should escape HTML tags as expected", function () {
        var html = "<h1>Hello, World!</h1>",
            html2 = html + "<p>This is a paragraph.</p>";
        assert.equal(toolkit.escape(html), "Hello, World!");
        assert.equal(toolkit.escape(html2), "Hello, World!This is a paragraph.");
    });
});

describe("dirname(path: string): string", function () {
    it("should get dirname as expected", function () {
        var dir = "/var/html".replace(/\/|\\/g, toolkit.Separator),
            filename = dir + toolkit.Separator + "test.txt",
            dir2 = "C:",
            filename2 = dir2 + toolkit.Separator + "test.txt";
        assert.equal(toolkit.dirname(filename), dir);
        assert.equal(toolkit.dirname("test.txt"), ".");
        assert.equal(toolkit.dirname(filename2), dir2);
    });
});

describe("basename(filename: stirng, extname?: string): string", function () {
    it("should get basename as expected", function () {
        var filename = "/var/html/test.txt",
            filename2 = "C:\\test.txt";
        assert.equal(toolkit.basename(filename), "test.txt");
        assert.equal(toolkit.basename(filename2), "test.txt");
        assert.equal(toolkit.basename("test.txt"), "test.txt");
        assert.equal(toolkit.basename(filename, ".txt"), "test");
        assert.equal(toolkit.basename(filename2, ".txt"), "test");
        assert.equal(toolkit.basename("test.txt", ".txt"), "test");
    });
});

describe("extname(filename: string): string", function () {
    it("should get extname as expected", function () {
        var filename = "/var/html/test.txt",
            filename2 = "C:\\test.txt";
        assert.equal(toolkit.extname(filename), ".txt");
        assert.equal(toolkit.extname(filename2), ".txt");
        assert.equal(toolkit.extname("test.txt"), ".txt");
    });
});

describe("normalizePath(path: string): string", function () {
    it("should normalize path as expected", function () {
        var filename = "/var/html/subdir/subdir2/../.././test.txt",
            filename2 = "C:\\subdir\\subdir2\\..\\..\\.\\test.txt";
        assert.equal(toolkit.normalizePath(filename), "/var/html/test.txt".replace(/\/|\\/g, toolkit.Separator));
        assert.equal(toolkit.normalizePath(filename2), "C:\\test.txt".replace(/\/|\\/g, toolkit.Separator));
    });
});

describe("getCwd(): string", function () {
    it("should get current working directory as expected", function () {
        assert.equal(toolkit.getCwd(), process.cwd());
    });
});

describe("isAbsPath(path: string): boolean", function () {
    it("should assert whether the given path is absolute or not", function () {
        var path = "test.txt",
            path2 = "/var/html/",
            path3 = path2 + path,
            path4 = "C:\\somedir\\",
            path5 = path4 + path;

        assert.ok(!toolkit.isAbsPath(path));
        assert.ok(toolkit.isAbsPath(path2));
        assert.ok(toolkit.isAbsPath(path3));
        assert.ok(toolkit.isAbsPath(path4));
        assert.ok(toolkit.isAbsPath(path5));
    });
});

describe("getAbsPath(filename: string): string", function () {
    it("should get absolute path of the given filename", function () {
        var filename = "test.txt",
            filename2 = "/var/html/test.txt",
            filename3 = "C:\\test.txt";
        assert.equal(toolkit.getAbsPath(filename), process.cwd() + toolkit.Separator + filename);
        assert.equal(toolkit.getAbsPath(filename2), filename2.replace(/\\|\//g, toolkit.Separator));
        assert.equal(toolkit.getAbsPath(filename3), filename3.replace(/\\|\//g, toolkit.Separator));
    });
});

describe("getObjectValues(obj: any): any[]", function () {
    it("should get values of the given object", function () {
        var obj = { hello: "world" },
            arr = ["Hello", "World"],
            str = "Hello, World!";
        assert.deepStrictEqual(toolkit.getObjectValues(obj), ["world"]);
        assert.deepStrictEqual(toolkit.getObjectValues(arr), arr);
        assert.deepStrictEqual(toolkit.getObjectValues(str), str.split(""));
    });
});

describe("getFunctionBodyOffset(fn: Function): { line: number, column: number }", function () {
    it("should get the function body offset as expected", function () {
        var fn = function () {
            console.log("Hello, World!");
        };
        var fn2 = new Function("a", "b", "console.log('Hello, World!', a, b)");
        assert.deepStrictEqual(toolkit.getFunctionBodyOffset(fn), { line: 1, column: 0 });
        assert.deepStrictEqual(toolkit.getFunctionBodyOffset(fn2), { line: 2, column: 0 });
    });
});