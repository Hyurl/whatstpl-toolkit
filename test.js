const fs = require("fs");
const toolkit = require("./");

var filename = "./example.html";
var parser = new toolkit.Parser(filename);
var node = parser.parse(fs.readFileSync(filename, "utf8"));

console.log(node);