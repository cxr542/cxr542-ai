#!/usr/bin/env node
/**
 * Generate intro/{id}.html from intro/manifest.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(hubRoot, "intro", "manifest.json");
const outDir = path.join(hubRoot, "intro");

export const introPagesBase = "https://cxr542.github.io/cxr542-ai/intro";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPage(id, entry) {
  const links = (entry.links || [])
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`
    )
    .join("\n        ");

  const btnRow = (entry.links || [])
    .slice(0, 2)
    .map(
      (l, i) =>
        `<a class="btn${i ? " btn--ghost" : ""}" href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`
    )
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(entry.title)} — AI 학습 허브 소개" />
  <title>${escapeHtml(entry.title)} — 소개</title>
  <link rel="stylesheet" href="./intro.css" />
</head>
<body>
  <div class="wrap">
    <p class="back">
      <a href="../">← AI 학습 허브</a>
      ·
      <a href="https://cxr542.github.io/">프로필</a>
    </p>
    <h1>${escapeHtml(entry.title)}</h1>
    <p class="lead">${escapeHtml(entry.lead)}</p>
    ${
      links
        ? `<div class="card">
      <h2>바로가기</h2>
      <ul>
        ${links}
      </ul>
      ${btnRow ? `<div class="btn-row">${btnRow}</div>` : ""}
    </div>`
        : `<p class="muted">데모·저장소 링크는 허브 카드에서 확인하세요.</p>`
    }
  </div>
</body>
</html>
`;
}

export function getIntroUrl(id, entry) {
  if (entry?.introUrl) return entry.introUrl;
  return `${introPagesBase}/${id}.html`;
}

export function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

export function loadIntroOverrides() {
  const overridesPath = path.join(hubRoot, "ai", "intro-overrides.json");
  if (!fs.existsSync(overridesPath)) return {};
  const raw = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
  return raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {};
}

export function loadMergedManifest() {
  const manifest = loadManifest();
  const overrides = loadIntroOverrides();
  const merged = { ...manifest };
  Object.entries(overrides).forEach(([id, entry]) => {
    merged[id] = { ...(merged[id] || {}), ...entry };
  });
  return merged;
}

export function ensureIntroLink(links, id, manifest) {
  const entry = manifest[id];
  const introUrl = entry ? getIntroUrl(id, entry) : `${introPagesBase}/${id}.html`;
  const rest = (links || []).filter((l) => l.label !== "소개");
  if (!introUrl) return links || [];
  return [{ label: "소개", url: introUrl }, ...rest];
}

function main() {
  const manifest = loadManifest();
  if (!fs.existsSync(path.join(outDir, "intro.css"))) {
    console.warn("intro/intro.css missing");
  }

  let wrote = 0;
  Object.entries(manifest).forEach(([id, entry]) => {
    if (entry.introUrl) return;
    const html = renderPage(id, entry);
    fs.writeFileSync(path.join(outDir, `${id}.html`), html, "utf8");
    wrote += 1;
  });

  console.log("Wrote", wrote, "intro HTML pages");
}

function patchCatalog(relPath, manifest) {
  const p = path.join(hubRoot, relPath);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.items = (data.items || []).map((item) => ({
    ...item,
    links: ensureIntroLink(item.links, item.id, manifest),
  }));
  data.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Patched", relPath);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = loadMergedManifest();
  main();
  patchCatalog("ai/services.json", manifest);
  patchCatalog("ai/projects.json", manifest);
}
