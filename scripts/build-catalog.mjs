#!/usr/bin/env node
/**
 * Merge ai/services.json + ai/projects.json → ai/catalog.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const servicesPath = path.join(hubRoot, "ai", "services.json");
const projectsPath = path.join(hubRoot, "ai", "projects.json");
const outPath = path.join(hubRoot, "ai", "catalog.json");
const overridesPath = path.join(hubRoot, "ai", "category-overrides.json");
const navLabelsPath = path.join(hubRoot, "ai", "nav-labels.json");

const CATEGORY_BY_ID = {
  "today-shoes": "hobby",
  "ppt-academizer": "work",
  "edu-team-tms": "work",
  "github-pages": "work",
  cxr542: "work",
  "deploy_test": "ideas",
  webtest: "ideas",
  "zero-g-vibe": "study",
  "ai-hub": "study",
};

const EXCLUDE_FROM_SECTIONS = new Set(["zero-g-vibe", "ai-hub"]);

const EXTRA_ITEMS = [
  {
    id: "education-kpi",
    title: "교육팀 KPI 정의서",
    summary:
      "핵심 역량 레벨(종합) — 레벨·다면·리더·실전적용 4요소 KPI 보완본.",
    status: "learning",
    category: "work",
    tags: ["KPI", "Education"],
    links: [],
    source: "manual",
  },
  {
    id: "hub-v3-rollout",
    title: "cxr542-hub TMS UI",
    summary: "왼쪽 카테고리 · 오른쪽 탭 · 소개/앱 패널.",
    status: "idea",
    category: "ideas",
    tags: ["portal"],
    nextAction: "배포 후 프로필 링크 갱신",
    links: [],
    source: "manual",
  },
];

function loadJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function mergeItem(base, overlay) {
  if (!overlay) return base;
  const tags = [...new Set([...(base.tags || []), ...(overlay.tags || [])])];
  const linkMap = new Map();
  [...(base.links || []), ...(overlay.links || [])].forEach((l) => {
    linkMap.set(l.label + "|" + l.url, l);
  });
  return {
    ...overlay,
    ...base,
    title: base.title || overlay.title,
    summary: base.summary || overlay.summary,
    status: base.status || overlay.status,
    tags,
    links: [...linkMap.values()],
    source: base.source || overlay.source,
  };
}

function resolveCategory(item) {
  if (item.category) return item.category;
  if (CATEGORY_BY_ID[item.id]) return CATEGORY_BY_ID[item.id];
  if (item.status === "idea") return "ideas";
  return "study";
}

function loadCategoryOverrides() {
  const raw = loadJson(overridesPath);
  if (!raw) return {};
  return raw.overrides && typeof raw.overrides === "object" ? raw.overrides : raw;
}

function loadNavLabels() {
  const raw = loadJson(navLabelsPath);
  if (!raw || !raw.labels) return {};
  return raw.labels;
}

function deriveLinkFields(item) {
  const links = item.links || [];
  const intro = links.find((l) => l.label === "소개");
  const repo = links.find(
    (l) => l.label === "Repo" || l.label === "repo" || l.label === "GitHub"
  );
  const appUrls = links
    .filter(
      (l) =>
        l.label !== "소개" &&
        l.label !== "Repo" &&
        l.label !== "repo" &&
        l.label !== "GitHub"
    )
    .map((l) => ({ label: l.label, url: l.url }));

  const primaryAppUrl =
    item.primaryAppUrl ||
    (appUrls.length ? appUrls[0].url : null);

  const introUrl = item.introUrl || (intro && intro.url) || null;
  const repoUrl = item.repoUrl || (repo && repo.url) || null;

  return {
    introUrl,
    repoUrl,
    primaryAppUrl,
    appUrls,
    embedAllowed:
      item.embedAllowed !== false &&
      item.category !== "ideas" &&
      !!primaryAppUrl,
  };
}

function main() {
  const fileOverrides = loadCategoryOverrides();
  const navLabels = loadNavLabels();
  const services = loadJson(servicesPath) || { items: [], resources: [] };
  const projects = loadJson(projectsPath) || { items: [] };
  const byId = new Map();

  (projects.items || []).forEach((item) => {
    byId.set(item.id, { ...item, source: "projects" });
  });

  (services.items || []).forEach((item) => {
    const prev = byId.get(item.id);
    byId.set(item.id, mergeItem({ ...item, source: "services" }, prev));
  });

  EXTRA_ITEMS.forEach((item) => {
    const prev = byId.get(item.id);
    byId.set(item.id, prev ? mergeItem(item, prev) : item);
  });

  const items = [...byId.values()]
    .map((item) => {
      const categoryBase = resolveCategory(item);
      const category = fileOverrides[item.id] || categoryBase;
      const { localFolder, deployable, deploySkip, ...rest } = item;
      const withCat = { ...rest, category, categoryBase };
      return {
        ...withCat,
        ...deriveLinkFields(withCat),
        sectionHidden: EXCLUDE_FROM_SECTIONS.has(item.id) || undefined,
      };
    })
    .filter((item) => !item.sectionHidden)
    .sort((a, b) => a.title.localeCompare(b.title, "ko"));

  const tagSet = new Set();
  items.forEach((i) => (i.tags || []).forEach((t) => tagSet.add(t)));

  const updated = [services.updated, projects.updated]
    .filter(Boolean)
    .sort()
    .pop();

  const defaultNav = {
    work: "업무 도우미",
    study: "공부·실험",
    hobby: "러닝·취미",
    ideas: "아이디어뱅크",
    guide: "Zero-G 바이브 코딩",
    resources: "참고 링크",
    profile: "프로필",
  };

  const out = {
    updated: updated || new Date().toISOString().slice(0, 10),
    profileUrl: services.profileUrl || "https://cxr542.github.io/",
    hubTitle: "cxr542-hub",
    categories: [
      { id: "work", label: navLabels.work || defaultNav.work },
      { id: "study", label: navLabels.study || defaultNav.study },
      { id: "hobby", label: navLabels.hobby || defaultNav.hobby },
      { id: "ideas", label: navLabels.ideas || defaultNav.ideas },
    ],
    navLabels: { ...defaultNav, ...navLabels },
    categoryOverrides: fileOverrides,
    items,
    resources: services.resources || [],
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", outPath, `(${items.length} items)`);
}

main();
