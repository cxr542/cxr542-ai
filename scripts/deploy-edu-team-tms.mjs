#!/usr/bin/env node
/**
 * TMS Vite 빌드 → projects/edu-team-tms/ (GitHub Pages)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const tmsDir = path.resolve(hubRoot, "../../apps/TMS(Team Management System)");
const outDir = path.join(hubRoot, "projects/edu-team-tms");
const pagesBase = "/cxr542-ai/projects/edu-team-tms/";

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

if (!fs.existsSync(path.join(tmsDir, "package.json"))) {
  console.error("TMS not found:", tmsDir);
  process.exit(1);
}

console.log("Building TMS with base", pagesBase);
execSync("npm run build:team", {
  cwd: tmsDir,
  stdio: "inherit",
  env: { ...process.env, TMS_PAGES_BASE: pagesBase },
});

const dist = path.join(tmsDir, "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("dist/index.html missing after build");
  process.exit(1);
}

rmrf(outDir);
copyDir(dist, outDir);
fs.copyFileSync(path.join(outDir, "index.html"), path.join(outDir, "404.html"));

console.log("Deployed TMS to", outDir);
console.log("Pages URL: https://cxr542.github.io/cxr542-ai/projects/edu-team-tms/");
