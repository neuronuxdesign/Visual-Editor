import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { argv } = require("node:process")
const { parse, format, normalize } = require("node:path")
const { writeFile } = require("node:fs/promises");

import tokenFile from "../token/token.json" assert { type: "json" }

const tokensToCss = (object = {}, base = `-`) =>
    Object.entries(object).reduce((css, [key, value]) => {
        let newBase = base + (object instanceof Array ? "" : `-${key}`);
        if (typeof value !== "object") {
            return css + newBase + `: ${value};\n`
        }
        return css + tokensToCss(value, newBase)
    }, ``)

const saveTokens = async (name, tokens) => {
    try {
        await writeFile(`src/styles/${name}.css`, tokens)
    } catch (e) {
        console.log("There was an error while saving a file.\n", e)
    }
}

try {
    const cssVariables = tokensToCss(tokenFile)
    const cssClass = `:root {\n${cssVariables.replaceAll("--", "  --")}}\n`

    saveTokens("base", cssClass);

} catch (e) {
    console.log(
        "Provide a correct argument - a relative path to design tokens.\n",
        e
    )
}