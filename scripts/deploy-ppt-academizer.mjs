#!/usr/bin/env node
/**
 * Copy ppt-academizer web UI to projects/ppt-academizer/ for GitHub Pages.
 * API: https://ppt-academizer.netlify.app (Netlify edge proxy).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const srcDir = path.resolve(hubRoot, "../../apps/ppt-academizer/web");
const outDir = path.join(hubRoot, "projects/ppt-academizer");
const apiBase = process.env.PPT_ACADEMIZER_API_URL || "https://ppt-academizer.netlify.app";

if (!fs.existsSync(path.join(srcDir, "index.html"))) {
  console.error("ppt-academizer web not found:", srcDir);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
for (const name of ["index.html"]) {
  fs.copyFileSync(path.join(srcDir, name), path.join(outDir, name));
}

fs.writeFileSync(
  path.join(outDir, "config.js"),
  `// GitHub Pages — API via Netlify (CORS on edge proxy)\nwindow.__PPT_ACADEMIZER_API__ = "${apiBase.replace(/\/$/, "")}";\n`
);

console.log("Deployed ppt-academizer UI to", outDir);
console.log("API base:", apiBase.replace(/\/$/, ""));
console.log("Pages URL: https://cxr542.github.io/cxr542-ai/projects/ppt-academizer/");
