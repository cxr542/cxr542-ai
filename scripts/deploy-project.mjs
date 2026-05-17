#!/usr/bin/env node
/**
 * Build an experiment and copy output to cxr542-ai/projects/<id>/
 * Usage: node scripts/deploy-project.mjs react_test
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { readMeta, detectDeployable } from "./experiment-meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const experimentsDir = path.resolve(hubRoot, "..", "experiments");
const pagesBasePath = "/cxr542-ai/projects";

const id = process.argv[2];
if (!id) {
  console.error("Usage: node scripts/deploy-project.mjs <project-id>");
  process.exit(1);
}

const projectDir = path.join(experimentsDir, id);
const outDir = path.join(hubRoot, "projects", id);

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
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function npmInstall(dir) {
  try {
    run("npm ci", dir);
  } catch {
    run("npm install", dir);
  }
}

if (id === "notes") {
  const notesDir = path.resolve(hubRoot, "..", "notes");
  rmrf(outDir);
  fs.mkdirSync(outDir, { recursive: true });
  if (fs.existsSync(notesDir)) {
    for (const f of fs.readdirSync(notesDir)) {
      if (f.endsWith(".md")) fs.copyFileSync(path.join(notesDir, f), path.join(outDir, f));
    }
  }
  fs.writeFileSync(
    path.join(outDir, "index.html"),
    `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>학습 메모</title><style>body{font-family:system-ui;background:#0a0a0a;color:#f5f5f5;padding:2rem}a{color:#e8a930}</style></head>
<body><h1>학습 메모</h1><ul>${fs
      .readdirSync(outDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => `<li><a href="${f}">${f}</a></li>`)
      .join("")}</ul>
<p><a href="https://cxr542.github.io/cxr542-ai/">← AI 허브</a></p></body></html>`
  );
  console.log("Deployed notes to", outDir);
  process.exit(0);
}

if (!fs.existsSync(projectDir)) {
  console.error("Project not found:", projectDir);
  process.exit(1);
}

const meta = readMeta(projectDir, id);
const { kind, reason } = detectDeployable(projectDir, meta);

if (kind === "skip") {
  console.error(`Skip deploy for ${id}: ${reason || "not deployable"}`);
  process.exit(1);
}

const pkgPath = path.join(projectDir, "package.json");
const hasPkg = fs.existsSync(pkgPath);
const base = `${pagesBasePath}/${id}/`;
const basePath = base.replace(/\/$/, "");

if (kind === "static" || (!hasPkg && fs.existsSync(path.join(projectDir, "index.html")))) {
  rmrf(outDir);
  copyDir(projectDir, outDir);
  console.log("Copied static project to", outDir);
  process.exit(0);
}

if (!hasPkg) {
  console.error("No package.json or index.html in", projectDir);
  process.exit(1);
}

if (kind === "vite") {
  npmInstall(projectDir);
  try {
    run("npx tsc -b", projectDir);
  } catch {
    /* optional typecheck */
  }
  run(`npx vite build --base ${base}`, projectDir);
  const dist = path.join(projectDir, "dist");
  if (!fs.existsSync(dist)) {
    console.error("dist/ not found after build");
    process.exit(1);
  }
  rmrf(outDir);
  copyDir(dist, outDir);
  console.log("Deployed Vite build to", outDir);
  process.exit(0);
}

if (kind === "next") {
  if (meta.deploySkip === "api-route" || id === "dynamic_deploy_test") {
    console.error(
      `Skip: ${id} uses API routes — refactor for static export or use Netlify (npm run netlify:deploy in project).`
    );
    process.exit(1);
  }

  const hasNextConfig =
    fs.existsSync(path.join(projectDir, "next.config.ts")) ||
    fs.existsSync(path.join(projectDir, "next.config.mjs")) ||
    fs.existsSync(path.join(projectDir, "next.config.js"));

  if (!hasNextConfig) {
    console.error("next.config not found in", projectDir);
    process.exit(1);
  }

  npmInstall(projectDir);
  for (const cacheDir of [".next", "out"]) {
    const p = path.join(projectDir, cacheDir);
    if (fs.existsSync(p)) rmrf(p);
  }
  const deployEnv = {
    CURSOR_PAGES_BASE: basePath,
    NODE_ENV: "production",
  };
  try {
    run("npm run build", projectDir, deployEnv);
  } catch {
    run("npx next build", projectDir, deployEnv);
  }

  const out = path.join(projectDir, "out");
  if (!fs.existsSync(out)) {
    console.error("out/ not found — set output: 'export' in next.config when CURSOR_PAGES_BASE is set");
    process.exit(1);
  }
  rmrf(outDir);
  copyDir(out, outDir);
  console.log("Deployed Next static export to", outDir);
  process.exit(0);
}

console.error("Unsupported project type for", id);
process.exit(1);
