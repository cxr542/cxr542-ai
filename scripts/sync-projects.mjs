#!/usr/bin/env node
/**
 * Scan ../experiments and merge into ai/projects.json (Win/Mac).
 * Preserves manual fields (summary, tags, links) when id matches.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const experimentsDir = path.resolve(hubRoot, "..", "experiments");
const outPath = path.join(hubRoot, "ai", "projects.json");
const pagesBase = "https://cxr542.github.io/cxr542-ai/projects";

const SKIP = new Set(["node_modules", ".git", "dist", ".next"]);

const defaultMeta = {
  react_test: {
    title: "React · Vite 클리커",
    summary: "모바일 클리커 게임 — Vite + React 실습",
    status: "demo",
    tags: ["Dev", "React"],
    deployable: "vite",
  },
  "next.js_test": {
    title: "Next.js · shadcn",
    summary: "Next.js App Router + shadcn/ui 실습",
    status: "learning",
    tags: ["Dev", "Next.js"],
    deployable: "next",
  },
  "markdown-editor": {
    title: "Markdown 에디터",
    summary: "CodeMirror + Express — 프론트 위주 실습 (API는 로컬)",
    status: "learning",
    tags: ["Dev", "Editor"],
    deployable: "vite",
  },
  dynamic_deploy_test: {
    title: "Dynamic Deploy Test",
    summary: "배포·동적 설정 실험",
    status: "learning",
    tags: ["Dev", "Deploy"],
  },
  Crawlingtest: {
    title: "Python 크롤링",
    summary: "교보문고 등 스크래핑 실습 스크립트",
    status: "local",
    tags: ["Python", "Dev"],
  },
  webtest: {
    title: "Web Test",
    summary: "정적 HTML 웹 실험 (준비 중)",
    status: "planned",
    tags: ["Dev"],
  },
  deploy_test: {
    title: "Deploy Test",
    summary: "배포 테스트 (준비 중)",
    status: "planned",
    tags: ["Dev", "Deploy"],
  },
};

function titleFromId(id) {
  return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function demoLink(id) {
  return { label: "데모", url: `${pagesBase}/${id}/` };
}

function loadExisting() {
  if (!fs.existsSync(outPath)) return { updated: "", categories: [], items: [] };
  return JSON.parse(fs.readFileSync(outPath, "utf8"));
}

function readMeta(folderPath, id) {
  const metaPath = path.join(folderPath, "project.meta.json");
  let fileMeta = {};
  if (fs.existsSync(metaPath)) {
    try {
      fileMeta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch {
      /* ignore */
    }
  }
  const defaults = defaultMeta[id] || {};
  return { ...defaults, ...fileMeta };
}

function stripForPublish(item) {
  const { localFolder, deployable, ...rest } = item;
  return rest;
}

function main() {
  if (!fs.existsSync(experimentsDir)) {
    console.error("experiments not found:", experimentsDir);
    process.exit(1);
  }

  const existing = loadExisting();
  const byId = new Map((existing.items || []).map((i) => [i.id, i]));

  const dirs = fs
    .readdirSync(experimentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !SKIP.has(d.name))
    .map((d) => d.name)
    .sort();

  const items = dirs.map((id) => {
    const folderPath = path.join(experimentsDir, id);
    const meta = readMeta(folderPath, id);
    const prev = byId.get(id) || {};
    const status = prev.status || meta.status || "learning";
    const deployable = meta.deployable || prev.deployable;
    const links = [...(prev.links || meta.links || [])];

    const hasDemo = links.some((l) => l.label === "데모");
    if (
      (status === "demo" || deployable === "vite" || deployable === "static") &&
      !hasDemo
    ) {
      links.unshift(demoLink(id));
    }

    return stripForPublish({
      id,
      title: prev.title || meta.title || titleFromId(id),
      summary:
        prev.summary ||
        meta.summary ||
        `Cursorstudy experiments/${id}`,
      status,
      tags: prev.tags || meta.tags || ["Dev"],
      deployable,
      links,
    });
  });

  const profileCard = {
    id: "adri-fluid-dark",
    title: "프로필 · 경력 사이트",
    summary: "김윤형 솔루션 교육·컨설턴트 포트폴리오 (HWP 반영)",
    status: "demo",
    tags: ["Education", "Dev"],
    links: [
      { label: "사이트", url: "https://cxr542.github.io/" },
      {
        label: "Repo",
        url: "https://github.com/cxr542/cxr542.github.io",
      },
    ],
  };

  const notesItems = [];
  const notesDir = path.resolve(hubRoot, "..", "notes");
  if (fs.existsSync(notesDir)) {
    fs.readdirSync(notesDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .forEach((file) => {
        const id = file.replace(/\.md$/, "");
        notesItems.push({
          id: `note-${id}`,
          title: titleFromId(id),
          summary: `학습 메모 — notes/${file}`,
          status: "demo",
          tags: ["Notes", "Education"],
          links: [
            {
              label: "문서",
              url: `${pagesBase}/notes/${file}`,
            },
          ],
        });
      });
  }

  const allItems = [profileCard, ...items, ...notesItems];
  const tagSet = new Set();
  allItems.forEach((i) => (i.tags || []).forEach((t) => tagSet.add(t)));

  const out = {
    updated: new Date().toISOString().slice(0, 10),
    categories: [...tagSet].sort(),
    items: allItems,
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", outPath, `(${allItems.length} items)`);
}

main();
