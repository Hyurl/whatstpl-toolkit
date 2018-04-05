# WhatsTPL Toolkit

**A toolkit for WhatsTPL.**

This package contains the WhatsTPL parser (JavaScript implementation) and some
useful functions that both work with NodeJS and browsers, and dependency free.

## Example

```javascript
const fs = require("fs");
const WhatsTplToolkit = require("whatstpl-toolkit");

var filename = "./example.html";
var parser = new WhatsTplToolkit.Parser(filename);
var node = parser.parse(fs.readFileSync(filename, "utf8"));

console.log(node);
```

## API

### `Parser`

- `new Parser(filename?: string)` the `filename` are only for error catching 
    at parsing time.
- `Parser.prototye.parse(tpl: string): Node` `Node` is a TypeScript interface 
    that contains:
    - `tag?: string` the block tag name, only appears when the current node is
        a block or the `type` is `var`.
    - `type: string` could be `root`, `text`, `var`, `block`, `comment` or 
        `snippet`.
    - `line: number` the line number of the current node.
    - `column: number` the column number of the current node.
    - `attributes?: { [name: string]: Attribute }` `Attribute` contains:
        - `name: string`
        - `value: string`
        - `line: number`
        - `column: number`
    - `contents: string | Node[]` if the `type` is `root` or `block`, this 
        property is an array of `Node` that contains children nodes.
    - `close?: boolean` Whether the block tag is closed, both `/>` and 
        `</block-name>` are considered to close the tag.
- `Parser.prototype.on(event: string, listner: (...args) => void)` exactly 
    the same as NodeJS emitter, but bring support to browsers. events `text`, 
    `var`, `block`, `comment` or `snippet` will be fired when parsing the type
    (`root` is not a block `type` exactly), and the first argument passed to 
    `listner` is the current parsing node.

### Constants

- `IsBrowser: boolean` Whether the program is runing in a browser.
- `Separator: "\\" | "/"` Path separator. 

### Functions

- `escape(html: string): string` Escapes HTML tags.
- `dirname(path: string): string` Gets the dirname according to the given path.
- `basename(filename: string, extname: string = ""): string` Gets the basename
    of a file.
- `extname(filename: string): string` Gets the extension name of a file.
- `normalizePath(path: string): string` Normalizes the given path, strips 
    `../` and `./`, and corrects the path separator.
- `getCwd(): string` Gets the current working directory.
- `isAbsPath(path: string): boolean` Checks if the given path is absolute.
- `getAbsPath(filename: string): string` Gets the absolute path of a file.
- `getObjectValues(obj: any): any[]` Gets the values of an object.

### UnclosedTagError

This is an error class used when passing a template, when it's thrown, the 
error object will carry a `filename`, a `line` number and a `column` number, 
so the program can know where the problem is in the template.


### Node and Attribute interface

They've already been talked above, this package also exports them, so they 
could be used in the compile implementation.