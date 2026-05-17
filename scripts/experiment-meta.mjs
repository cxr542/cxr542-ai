/** Shared experiment catalog metadata (sync-projects, check-deploy, deploy). */
import fs from "fs";
import path from "path";

export const SKIP = new Set(["node_modules", ".git", "dist", ".next", "out"]);

export const pagesBase = "https://cxr542.github.io/cxr542-ai/projects";

export const defaultMeta = {
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
    deployable: "next",
    deploySkip: "api-route",
  },
  Crawlingtest: {
    title: "Python 크롤링",
    summary: "교보문고 등 스크래핑 실습 스크립트",
    status: "local",
    tags: ["Python", "Dev"],
    deploySkip: "local-python",
  },
  webtest: {
    title: "Web Test",
    summary: "정적 HTML 웹 실험 (준비 중)",
    status: "planned",
    tags: ["Dev"],
    deploySkip: "empty",
  },
  deploy_test: {
    title: "Deploy Test",
    summary: "배포 테스트 (준비 중)",
    status: "planned",
    tags: ["Dev", "Deploy"],
    deploySkip: "empty",
  },
};

export function readMeta(folderPath, id) {
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

export function listExperimentIds(experimentsDir) {
  if (!fs.existsSync(experimentsDir)) return [];
  return fs
    .readdirSync(experimentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !SKIP.has(d.name))
    .map((d) => d.name)
    .sort();
}

export function detectDeployable(projectDir, meta) {
  if (meta.deploySkip) return { kind: "skip", reason: meta.deploySkip };
  if (meta.deployable) return { kind: meta.deployable, reason: "" };
  const indexHtml = path.join(projectDir, "index.html");
  if (fs.existsSync(indexHtml) && !fs.existsSync(path.join(projectDir, "package.json"))) {
    return { kind: "static", reason: "" };
  }
  if (
    fs.existsSync(path.join(projectDir, "vite.config.ts")) ||
    fs.existsSync(path.join(projectDir, "vite.config.js"))
  ) {
    return { kind: "vite", reason: "" };
  }
  const pkgPath = path.join(projectDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.dependencies?.next) {
      return { kind: "next", reason: "" };
    }
  }
  return { kind: "skip", reason: "unsupported" };
}
