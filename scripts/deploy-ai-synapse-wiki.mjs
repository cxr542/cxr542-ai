#!/usr/bin/env node
/**
 * Build AI-Synapse-Wiki and copy to projects/ai-synapse-wiki/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const wikiRoot =
  process.env.WIKI_ROOT ||
  path.resolve(hubRoot, "..", "ai-synapse-wiki-push");
const outDir = path.join(hubRoot, "projects", "ai-synapse-wiki");
const base = "/cxr542-ai/projects/ai-synapse-wiki/";

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function run(cmd, cwd, env = {}) {
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
}

if (!fs.existsSync(wikiRoot)) {
  console.error("Wiki repo not found:", wikiRoot);
  process.exit(1);
}

console.log("Wiki root:", wikiRoot);
console.log("Pages base:", base);

run("node scripts/build-entries.mjs", wikiRoot);
if (fs.existsSync(path.join(wikiRoot, "node_modules"))) {
  run("npm run build", wikiRoot, { VITE_BASE: base });
} else {
  const cache = path.join(process.env.USERPROFILE || "", ".cache", "ai-synapse-wiki");
  if (!fs.existsSync(path.join(cache, "node_modules"))) {
    console.error("Run npm install in", cache, "or clone wiki with node_modules");
    process.exit(1);
  }
  run("npm run build", wikiRoot, {
    VITE_BASE: base,
    NODE_PATH: path.join(cache, "node_modules"),
    PATH: `${path.join(cache, "node_modules", ".bin")}${path.delimiter}${process.env.PATH}`,
  });
}

const dist = path.join(wikiRoot, "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("dist/ missing — build failed?");
  process.exit(1);
}

rmrf(outDir);
copyDir(dist, outDir);
const indexHtml = path.join(outDir, "index.html");
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, path.join(outDir, "404.html"));
}
console.log("Deployed →", outDir);
