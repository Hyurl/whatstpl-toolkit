const fs = require("fs");
const toolkit = require("./");

var filename = "./example.html";
var tpl = [
    `<import target="my-block" from="~whatstpl1.html"/>`,
    `<my-block data="arr" />`,
    `<a>HAHA</a>`
].join("\n");
var parser = new toolkit.Parser(filename);
var node = parser.parse(tpl);

console.log(node.contents);