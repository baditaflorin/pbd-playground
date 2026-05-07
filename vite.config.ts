import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};
const buildInputPaths = [
  "src",
  "public",
  "scripts",
  "wasm",
  "index.html",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
].join(" ");

function gitValue(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

export default defineConfig({
  base: "/pbd-playground/",
  publicDir: "public",
  build: {
    outDir: "docs",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/lucide")) return "icons";
          return undefined;
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_COMMIT__: JSON.stringify(
      gitValue(`git log -1 --format=%h -- ${buildInputPaths}`, "unknown"),
    ),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
