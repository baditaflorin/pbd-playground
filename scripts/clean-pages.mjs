import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const docsDir = new URL("../docs", import.meta.url);
const generatedEntries = [
  "assets",
  "index.html",
  "404.html",
  "manifest.webmanifest",
  "favicon.svg",
  "sw.js",
  "wasm",
];

for (const entry of generatedEntries) {
  const target = join(docsDir.pathname, entry);
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
}

for (const file of readdirSync(docsDir)) {
  if (/\.(map|vite)$/.test(file)) {
    rmSync(join(docsDir.pathname, file), { force: true });
  }
}
