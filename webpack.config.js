module.exports = {
    mode: "production",
    entry: "./src/index.ts",
    devtool: "source-map",
    target: "node",
    node: {
        process: false
    },
    output: {
        path: __dirname,
        filename: "whatstpl-toolkit.min.js",
        library: "WhatsTplToolkit",
        libraryTarget: "umd"
    },
    resolve: {
        extensions: [".ts"]
    },
    module: {
        rules: [
            { test: /\.ts?$/, loader: "ts-loader" }
        ]
    }
};