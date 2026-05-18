import MarkdownIt from "https://cdn.jsdelivr.net/npm/markdown-it@14/+esm";
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

const mainEl = document.getElementById("viewer-main");
const titleEl = document.getElementById("viewer-title");
const sourceEl = document.getElementById("viewer-source");

function getNoteParam() {
  const fromQuery = new URLSearchParams(window.location.search).get("note");
  if (fromQuery) return fromQuery;
  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash) return "";
  if (hash.startsWith("note=")) return hash.slice(5);
  return hash;
}

const noteParam = getNoteParam();

function safeNoteName(name) {
  if (!name || !/^[\w.-]+\.md$/i.test(name) || name.includes("..")) {
    return null;
  }
  return name;
}

function showError(message) {
  mainEl.innerHTML = `<p class="viewer-error" role="alert">${message}</p>`;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
});

const defaultFence =
  md.renderer.rules.fence ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = (token.info || "").trim().toLowerCase();
  const langClass = info ? ` class="language-${info}"` : "";
  const html = defaultFence(tokens, idx, options, env, self);
  if (info === "mermaid") {
    return `<pre class="mermaid-source"><code${langClass}>${md.utils.escapeHtml(token.content)}</code></pre>`;
  }
  return html;
};

let mermaidReady = false;

function initMermaid() {
  if (!mermaidReady) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
    });
    mermaidReady = true;
  }
}

async function renderMermaid(container) {
  initMermaid();
  const sources = container.querySelectorAll("pre.mermaid-source");
  sources.forEach((pre) => {
    const code = pre.querySelector("code");
    const source = code?.textContent ?? "";
    const div = document.createElement("div");
    div.className = "mermaid";
    div.textContent = source;
    pre.replaceWith(div);
  });
  const nodes = container.querySelectorAll(".mermaid");
  if (nodes.length > 0) {
    await mermaid.run({ nodes });
  }
}

async function loadNote(fileName) {
  const res = await fetch(fileName, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`파일을 불러올 수 없습니다 (${res.status}): ${fileName}`);
  }
  return res.text();
}

async function run() {
  const fileName = safeNoteName(noteParam);
  if (!fileName) {
    showError(
      '메모 파일을 지정해 주세요. 예: <a href="viewer.html#apple-history-mindmap.md">viewer.html#apple-history-mindmap.md</a>'
    );
    return;
  }

  const displayName = fileName.replace(/\.md$/i, "");
  titleEl.textContent = displayName;
  document.title = `${displayName} — 학습 메모`;
  sourceEl.href = fileName;
  sourceEl.hidden = false;
  sourceEl.textContent = "소스 (.md)";

  try {
    const markdown = await loadNote(fileName);
    const html = md.render(markdown);
    mainEl.innerHTML = `<article class="note-content">${html}</article>`;
    await renderMermaid(mainEl.querySelector(".note-content"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showError(`렌더링 실패: ${msg}`);
    console.error(err);
  }
}

run();
