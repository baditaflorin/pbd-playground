import { copyFileSync } from "node:fs";

copyFileSync(
  new URL("../docs/index.html", import.meta.url),
  new URL("../docs/404.html", import.meta.url),
);
console.log("copied docs/index.html to docs/404.html");
