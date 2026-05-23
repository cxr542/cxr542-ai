#!/usr/bin/env node
/**
 * Scan ../experiments and merge into ai/projects.json (Win/Mac).
 * Preserves manual fields (summary, tags, links) when id matches.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pagesBase, readMeta, listExperimentIds } from "./experiment-meta.mjs";
import { loadManifest, ensureIntroLink } from "./build-intros.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const experimentsDir = path.resolve(hubRoot, "..", "experiments");
const outPath = path.join(hubRoot, "ai", "projects.json");
const projectsDir = path.join(hubRoot, "projects");

/** experiments/ 밖에서 수동 관리하는 카드 — CI sync 후에도 유지합니다. */
const PINNED_PROJECT_IDS = ["cloud-chatbot", "vision-font", "ppt-academizer", "gemini-tuner"];

function titleFromId(id) {
  return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function demoLink(id) {
  return { label: "데모", url: `${pagesBase}/${id}/` };
}

function hasLocalArtifact(id) {
  return fs.existsSync(path.join(projectsDir, id, "index.html"));
}

function loadExisting() {
  if (!fs.existsSync(outPath)) return { updated: "", categories: [], items: [] };
  return JSON.parse(fs.readFileSync(outPath, "utf8"));
}

function stripForPublish(item) {
  const { localFolder, deployable, deploySkip, ...rest } = item;
  return rest;
}

function main() {
  if (!fs.existsSync(experimentsDir)) {
    console.error("experiments not found:", experimentsDir);
    process.exit(1);
  }

  const existing = loadExisting();
  const byId = new Map((existing.items || []).map((i) => [i.id, i]));
  const introManifest = loadManifest();

  const dirs = listExperimentIds(experimentsDir);

  const items = dirs.map((id) => {
    const folderPath = path.join(experimentsDir, id);
    const meta = readMeta(folderPath, id);
    const prev = byId.get(id) || {};
    let status = prev.status || meta.status || "learning";
    const deployable = meta.deployable || prev.deployable;

    if (hasLocalArtifact(id) && deployable && !meta.deploySkip) {
      status = "demo";
    }

    const links = [...(prev.links || meta.links || [])];
    const hasDemo = links.some((l) => l.label === "데모");
    const shouldDemo =
      !meta.deploySkip &&
      (status === "demo" ||
        deployable === "vite" ||
        deployable === "static" ||
        deployable === "next") &&
      (hasLocalArtifact(id) || status === "demo");

    if (shouldDemo && !hasDemo) {
      links.unshift(demoLink(id));
    }

    const linksWithIntro = ensureIntroLink(links, id, introManifest);

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
      deploySkip: meta.deploySkip,
      links: linksWithIntro,
    });
  });

  const profileCard = stripForPublish({
    id: "cxr542",
    title: "프로필 · 경력 사이트",
    summary: "김윤형 솔루션 교육·컨설턴트 포트폴리오 (HWP 반영)",
    status: "demo",
    tags: ["Education", "Dev"],
    links: ensureIntroLink(
      [
        { label: "사이트", url: "https://cxr542.github.io/" },
        {
          label: "Repo",
          url: "https://github.com/cxr542/cxr542.github.io",
        },
      ],
      "cxr542",
      introManifest
    ),
  });

  const notesItems = [];
  const notesDir = path.resolve(hubRoot, "..", "notes");
  if (fs.existsSync(notesDir)) {
    fs.readdirSync(notesDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .forEach((file) => {
        const id = file.replace(/\.md$/, "");
        const noteId = `note-${id}`;
        notesItems.push({
          id: noteId,
          title: titleFromId(id),
          summary: `학습 메모 — notes/${file}`,
          status: "demo",
          tags: ["Notes", "Education"],
          links: ensureIntroLink(
            [
              {
                label: "문서",
                url: `${pagesBase}/notes/viewer.html#${file}`,
              },
            ],
            noteId,
            introManifest
          ),
        });
      });
  }

  const pinned = PINNED_PROJECT_IDS.map((id) => {
    const item = byId.get(id);
    if (!item) return null;
    return {
      ...item,
      links: ensureIntroLink(item.links, id, introManifest),
    };
  }).filter(Boolean);
  const pinnedSet = new Set(PINNED_PROJECT_IDS);
  const experimentItems = items.filter((i) => !pinnedSet.has(i.id));

  const allItems = [profileCard, ...pinned, ...experimentItems, ...notesItems];
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
