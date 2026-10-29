import { Module } from "node:module";
import { delimiter, resolve } from "node:path";

const nextCompiled = resolve(process.cwd(), "node_modules/next/dist/compiled");
const modulePaths = [
  nextCompiled,
  ...(process.env.NODE_PATH ?? "").split(delimiter).filter(Boolean),
];
process.env.NODE_PATH = [...new Set(modulePaths)].join(delimiter);
Module._initPaths();
