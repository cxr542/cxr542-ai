#!/usr/bin/env node
/**
 * Compare experiments/ folders vs cxr542-ai/projects/ and live GitHub Pages URLs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  pagesBase,
  readMeta,
  listExperimentIds,
  detectDeployable,
} from "./experiment-meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const experimentsDir = path.resolve(hubRoot, "..", "experiments");
const projectsDir = path.join(hubRoot, "projects");
const catalogPath = path.join(hubRoot, "ai", "projects.json");

const liveFlag = !process.argv.includes("--local-only");
const timeoutMs = 12000;

function loadCatalog() {
  if (!fs.existsSync(catalogPath)) return new Map();
  const data = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  return new Map((data.items || []).map((i) => [i.id, i]));
}

function hasLocal(id) {
  return fs.existsSync(path.join(projectsDir, id, "index.html"));
}

function catalogDemoUrl(item) {
  const demo = (item?.links || []).find((l) => l.label === "데모");
  return demo?.url || "";
}

async function headLive(id) {
  const url = `${pagesBase}/${id}/`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) return { status: res.status, ok: true };
    const getRes = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    return { status: getRes.status, ok: getRes.ok };
  } catch (e) {
    clearTimeout(timer);
    return { status: e.name === "AbortError" ? "timeout" : "error", ok: false };
  }
}

function pad(s, n) {
  const t = String(s);
  return t.length >= n ? t.slice(0, n - 1) + "…" : t + " ".repeat(n - t.length);
}

async function main() {
  if (!fs.existsSync(experimentsDir)) {
    console.error("experiments not found:", experimentsDir);
    process.exit(1);
  }

  const catalog = loadCatalog();
  const ids = listExperimentIds(experimentsDir);
  let failures = 0;

  console.log("");
  console.log(
    pad("id", 22),
    pad("deploy", 8),
    pad("local", 6),
    pad("live", 8),
    pad("catalog", 10),
    "note"
  );
  console.log("-".repeat(90));

  for (const id of ids) {
    const folderPath = path.join(experimentsDir, id);
    const meta = readMeta(folderPath, id);
    const { kind, reason } = detectDeployable(folderPath, meta);
    const local = hasLocal(id) ? "OK" : "—";
    const cat = catalog.get(id);
    const catStatus = cat?.status || meta.status || "?";
    const demoUrl = catalogDemoUrl(cat);

    let live = "—";
    if (kind !== "skip" && liveFlag) {
      if (hasLocal(id)) {
        const r = await headLive(id);
        live = r.ok ? String(r.status) : String(r.status);
        if (!r.ok) failures += 1;
      } else {
        live = "no-artifact";
        failures += 1;
      }
    } else if (kind !== "skip" && !liveFlag) {
      live = "skip";
    }

    let note = reason || "";
    if (kind !== "skip" && !hasLocal(id)) {
      note = note ? `${note}; missing projects/` : "missing projects/";
      failures += 1;
    }
    if (demoUrl && !hasLocal(id)) {
      note = note ? `${note}; catalog demo 404 risk` : "catalog demo 404 risk";
      failures += 1;
    }
    if (kind === "skip") {
      note = reason || "not targeted";
    }

    console.log(
      pad(id, 22),
      pad(kind, 8),
      pad(local, 6),
      pad(live, 8),
      pad(catStatus, 10),
      note
    );
  }

  if (fs.existsSync(path.join(projectsDir, "notes", "index.html"))) {
    console.log("");
    console.log("notes/: deployed (not under experiments/)");
  }

  console.log("");
  if (failures > 0) {
    console.log(`Issues: ${failures} (deploy missing artifacts or live check failed)`);
    process.exit(1);
  }
  console.log("All deployable experiments OK.");
}

main();
