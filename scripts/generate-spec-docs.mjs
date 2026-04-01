#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteRoot = path.resolve(__dirname, "..");
const publicRoot = path.join(siteRoot, "public");
const outputRoot = path.join(publicRoot, "spec");
const searchBasePath = path.join(siteRoot, "source", "search-index.base.json");

const args = process.argv.slice(2);
const isCheck = args.includes("--check");
const specDirArgIndex = args.indexOf("--spec-dir");
const specRoot = path.resolve(
  siteRoot,
  specDirArgIndex >= 0 && args[specDirArgIndex + 1] ? args[specDirArgIndex + 1] : "../spec"
);
const specDocsRoot = path.join(specRoot, "docs");
const extraSources = [
  {
    sourceRepoRel: "README.md",
    outputRel: "spec/repo/README.html",
    category: "Core",
    scopeLabel: "Repository source"
  },
  {
    sourceRepoRel: "CHANGELOG.md",
    outputRel: "spec/repo/CHANGELOG.html",
    category: "Process",
    scopeLabel: "Repository source"
  }
];

const categoryOrder = [
  "Core",
  "Versions",
  "Adapter",
  "Security",
  "Features",
  "Guides",
  "Process",
  "Architecture",
  "Research",
  "Reference",
  "ADRs"
];

if (!fs.existsSync(specDocsRoot)) {
  console.error(`Spec docs directory not found: ${specDocsRoot}`);
  process.exit(1);
}

assertPandoc();

const docs = [
  ...collectDocs(specDocsRoot).map((sourceFile) => {
    const sourceRel = path.relative(specDocsRoot, sourceFile).replace(/\\/g, "/");
    return createDocRecord({
      sourceFile,
      sourceRepoRel: `docs/${sourceRel}`,
      outputRel: `spec/${sourceRel.replace(/\.md$/i, ".html")}`,
      category: categoryFor(sourceRel),
      scopeLabel: sourceRel.startsWith("versions/") ? "Normative source" : "Support document"
    });
  }),
  ...extraSources
    .map((source) => {
      const sourceFile = path.join(specRoot, source.sourceRepoRel);
      if (!fs.existsSync(sourceFile)) {
        return null;
      }

      return createDocRecord({
        sourceFile,
        sourceRepoRel: source.sourceRepoRel,
        outputRel: source.outputRel,
        category: source.category,
        scopeLabel: source.scopeLabel
      });
    })
    .filter(Boolean)
];

const docLookup = new Map(docs.map((doc) => [doc.sourceRepoRel, doc.outputRel]));
const navGroups = buildNavGroups(docs);
const navSequence = navGroups.flatMap((group) => group.entries);
let changedFiles = 0;

for (const doc of docs) {
  const fragment = renderMarkdown(doc.markdown);
  const html = wrapSpecDocPage({
    doc,
    navGroups,
    navSequence,
    bodyHtml: rewriteLinks(stripFirstHeading(fragment), doc.sourceRepoRel, doc.outputRel, docLookup)
  });
  changedFiles += writeFile(path.join(publicRoot, doc.outputRel), html);
}

const specIndexHtml = wrapSpecIndexPage(navGroups);
changedFiles += writeFile(path.join(outputRoot, "index.html"), specIndexHtml);

const baseSearchEntries = JSON.parse(fs.readFileSync(searchBasePath, "utf8"));
const generatedSearchEntries = docs.map((doc) => ({
  title: `Spec: ${doc.title}`,
  url: `/${doc.outputRel}`,
  excerpt: doc.summary,
  keywords: buildKeywords(doc)
}));

const mergedSearch = [
  ...baseSearchEntries,
  {
    title: "Repo-Synced Spec Reference",
    url: "/spec/index.html",
    excerpt: "Full website-hosted mirror of the MCP-AQL spec docs generated from the spec repository source.",
    keywords: ["spec mirror", "repo synced", "full docs", "reference", "generated"]
  },
  ...generatedSearchEntries
];

changedFiles += writeFile(
  path.join(publicRoot, "data", "search-index.json"),
  `${JSON.stringify(mergedSearch, null, 2)}\n`
);

if (isCheck && changedFiles > 0) {
  console.error("Generated spec docs are out of date. Run `npm run generate:spec-docs`.");
  process.exit(1);
}

console.log(`${isCheck ? "Checked" : "Generated"} ${docs.length} spec doc pages.`);

function createDocRecord({ sourceFile, sourceRepoRel, outputRel, category, scopeLabel }) {
  const markdown = fs.readFileSync(sourceFile, "utf8");
  const { body, metadata } = splitFrontMatter(markdown);
  const title = extractTitle(body, sourceRepoRel, metadata);
  const status = extractField(body, "Status", metadata);
  const version = extractField(body, "Version", metadata);
  const lastUpdated = extractField(body, "Last Updated", metadata);
  const summary = extractSummary(body, title);

  return {
    sourceFile,
    sourceRepoRel,
    outputRel,
    markdown,
    title,
    status,
    version,
    lastUpdated,
    summary,
    category,
    scopeLabel
  };
}

function assertPandoc() {
  try {
    execFileSync("pandoc", ["--version"], { stdio: "ignore" });
  } catch (error) {
    console.error("pandoc is required to generate the repo-synced spec pages.");
    process.exit(1);
  }
}

function collectDocs(rootDir) {
  const files = [];

  walk(rootDir);

  return files.sort((left, right) => left.localeCompare(right));

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (absolute.includes(`${path.sep}agent${path.sep}development`)) {
          continue;
        }
        walk(absolute);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const rel = path.relative(rootDir, absolute).replace(/\\/g, "/");
      if (rel.startsWith("agent/development/")) {
        continue;
      }
      files.push(absolute);
    }
  }
}

function extractTitle(markdown, sourceRel, metadata = {}) {
  if (metadata.title) {
    return metadata.title.trim();
  }

  let inCodeFence = false;
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (!inCodeFence && /^#\s+/.test(trimmed)) {
      return trimmed.replace(/^#\s+/, "").trim();
    }
  }

  return sourceRel
    .replace(/\.md$/i, "")
    .split("/")
    .pop()
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function extractField(markdown, label, metadata = {}) {
  const normalizedKey = label.toLowerCase().replace(/\s+/g, "_");
  if (metadata[normalizedKey]) {
    return metadata[normalizedKey].trim();
  }

  const expression = new RegExp(`^\\*\\*${escapeRegExp(label)}:\\*\\*\\s+(.+)$`, "m");
  const match = markdown.match(expression);
  return match ? match[1].trim() : "";
}

function extractSummary(markdown, title) {
  const lines = markdown.split(/\r?\n/);
  let inCodeFence = false;
  let skipToc = false;
  const paragraph = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      continue;
    }

    if (trimmed === "## Table of Contents") {
      skipToc = true;
      continue;
    }

    if (skipToc) {
      if (trimmed === "---") {
        skipToc = false;
      }
      continue;
    }

    if (!trimmed) {
      if (paragraph.length) {
        break;
      }
      continue;
    }

    if (
      /^\*\*(Version|Status|Last Updated):\*\*/.test(trimmed) ||
      /^[a-z_]+:\s+.+$/i.test(trimmed) ||
      /^[-*+]\s+/.test(trimmed) ||
      /^\d+\.\s+/.test(trimmed) ||
      /^#{1,6}\s+/.test(trimmed) ||
      /^\|/.test(trimmed)
    ) {
      continue;
    }

    paragraph.push(trimmed.replace(/^>\s?/, ""));
  }

  if (!paragraph.length) {
    return title;
  }

  return stripMarkdown(paragraph.join(" ")).slice(0, 220);
}

function renderMarkdown(markdown) {
  return execFileSync(
    "pandoc",
    ["--from=gfm", "--to=html5", "--wrap=none"],
    {
      input: markdown,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    }
  );
}

function stripFirstHeading(html) {
  return html.replace(/^<h1[^>]*>[\s\S]*?<\/h1>\n?/, "");
}

function rewriteLinks(html, currentSourceRepoRel, currentOutputRel, docLookup) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (fullMatch, attribute, target) => {
    return `${attribute}="${resolveTarget(target, currentSourceRepoRel, currentOutputRel, docLookup)}"`;
  });
}

function resolveTarget(target, currentSourceRepoRel, currentOutputRel, docLookup) {
  if (!target || target.startsWith("#") || /^[a-z]+:/i.test(target) || target.startsWith("/")) {
    return target;
  }

  const [rawPath, hash = ""] = target.split("#");
  const anchor = hash ? `#${hash}` : "";
  const repoRelativeTarget = path
    .normalize(path.join(path.dirname(currentSourceRepoRel), rawPath))
    .replace(/\\/g, "/");
  const absoluteTarget = path.join(specRoot, repoRelativeTarget);

  if (rawPath.endsWith(".md") && docLookup.has(repoRelativeTarget)) {
    const targetOutputRel = docLookup.get(repoRelativeTarget);
    const relativeUrl = path.relative(path.dirname(currentOutputRel), targetOutputRel).replace(/\\/g, "/");
    return `${relativeUrl || path.basename(targetOutputRel)}${anchor}`;
  }

  if (rawPath.endsWith(".md") && fs.existsSync(absoluteTarget)) {
    return `https://github.com/MCPAQL/spec/blob/main/${repoRelativeTarget}${anchor}`;
  }

  return `https://github.com/MCPAQL/spec/blob/main/${repoRelativeTarget}${anchor}`;
}

function buildNavGroups(docs) {
  const grouped = new Map();
  for (const category of categoryOrder) {
    grouped.set(category, []);
  }

  for (const doc of docs) {
    if (!grouped.has(doc.category)) {
      grouped.set(doc.category, []);
    }
    grouped.get(doc.category).push(doc);
  }

  return Array.from(grouped.entries())
    .map(([category, entries]) => ({ category, entries }))
    .filter((group) => group.entries.length > 0);
}

function wrapSpecDocPage({ doc, navGroups, navSequence, bodyHtml }) {
  const navHtml = renderNavGroups(navGroups, doc.outputRel);
  const pageNavHtml = renderSpecPageNav(doc, navSequence);
  const sourceUrl = `https://github.com/MCPAQL/spec/blob/main/${doc.sourceRepoRel}`;
  const metaBits = [
    `<span class="state-chip live">${escapeHtml(doc.scopeLabel)}</span>`,
    doc.status ? `<span class="state-chip pending">${escapeHtml(doc.status)}</span>` : "",
    doc.version ? `<span class="state-chip">${escapeHtml(doc.version)}</span>` : "",
    doc.lastUpdated ? `<span class="state-chip">${escapeHtml(doc.lastUpdated)}</span>` : ""
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(doc.summary)}">
  <title>MCP-AQL Spec | ${escapeHtml(doc.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${relativeAssetPath(doc.outputRel, "css/style.css")}">
</head>
<body>
  <header>
    <div class="container">
      <nav>
        <a class="logo" href="${relativePathFromDoc(doc.outputRel, "index.html")}"><span class="logo-mark"></span>MCP-AQL</a>
        <ul class="nav-links">
          <li><a href="${relativePathFromDoc(doc.outputRel, "index.html")}">Home</a></li>
          <li><a href="${relativePathFromDoc(doc.outputRel, "docs/index.html")}">Docs</a></li>
          <li><a href="${relativePathFromDoc(doc.outputRel, "launch-checklist.html")}">Launch Checklist</a></li>
          <li><a href="${relativePathFromDoc(doc.outputRel, "apis/index.html")}">Adapter Patterns</a></li>
        </ul>
        <form class="site-search" data-search-form data-index-url="${relativePathFromDoc(doc.outputRel, "data/search-index.json")}" role="search">
          <label class="sr-only" for="site-search-input">Search MCP-AQL docs</label>
          <input id="site-search-input" data-search-input type="search" placeholder="Search MCP-AQL docs, spec pages, and adapter patterns...">
          <span class="search-count" data-search-count></span>
          <ul class="search-results" data-search-results hidden></ul>
        </form>
      </nav>
    </div>
  </header>

  <main>
    <div class="container docs-shell">
      <aside class="docs-side">
        <h2>Repo-Synced Spec</h2>
        <p class="docs-side-note">Generated from <code>MCPAQL/spec</code> so the website carries the deeper protocol material too.</p>
        ${navHtml}
      </aside>

      <article class="docs-main">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li><a href="${relativePathFromDoc(doc.outputRel, "index.html")}">Home</a></li>
            <li><a href="${relativePathFromDoc(doc.outputRel, "spec/index.html")}">Full Spec</a></li>
            <li><span class="current">${escapeHtml(doc.title)}</span></li>
          </ol>
        </nav>
        <section class="hero docs-hero">
          <div class="hero-inner">
            <span class="status-pill">REPO-SYNCED SPEC DOC</span>
            <h1>${escapeHtml(doc.title)}</h1>
            <p class="lede">${escapeHtml(doc.summary)}</p>
            <div class="spec-meta">${metaBits}</div>
            <p class="spec-source">Source: <a href="${sourceUrl}">${escapeHtml(`spec/${doc.sourceRepoRel}`)}</a></p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="${sourceUrl}">Open Source Markdown</a>
              <a class="btn btn-secondary" href="${relativePathFromDoc(doc.outputRel, "spec/index.html")}">Browse Full Spec Reference</a>
            </div>
          </div>
        </section>

        <section>
          <div class="card spec-prose">
            ${bodyHtml}
          </div>
        </section>
        ${pageNavHtml}
      </article>
    </div>
  </main>

  <footer>
    <div class="container">
      <p>&copy; 2026 DollhouseMCP Inc. d/b/a Dollhouse Research. MCP-AQL public draft documentation portal.</p>
      <div class="footer-links">
        <a href="${relativePathFromDoc(doc.outputRel, "docs/index.html")}">Docs Library</a>
        <a href="${relativePathFromDoc(doc.outputRel, "spec/index.html")}">Repo-Synced Spec</a>
        <a href="https://github.com/MCPAQL">MCPAQL Organization</a>
        <a href="https://dollhouseresearch.com">Dollhouse Research</a>
      </div>
    </div>
  </footer>

  <script src="${relativeAssetPath(doc.outputRel, "js/search.js")}"></script>
</body>
</html>
`;
}

function wrapSpecIndexPage(navGroups) {
  const sections = navGroups.map((group) => {
    const cards = group.entries.map((doc) => {
      const href = relativePathWithinPublic("spec/index.html", doc.outputRel);
      return `<article class="card">
  <h3><a href="${href}">${escapeHtml(doc.title)}</a></h3>
  <p>${escapeHtml(doc.summary)}</p>
  <div class="spec-meta">
    <span class="state-chip live">${escapeHtml(doc.scopeLabel)}</span>
    ${doc.status ? `<span class="state-chip pending">${escapeHtml(doc.status)}</span>` : ""}
  </div>
</article>`;
    }).join("\n");

    return `<section>
  <h2 class="section-title">${escapeHtml(group.category)}</h2>
  <div class="grid cols-3 spec-index-grid">
    ${cards}
  </div>
</section>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Repo-synced full MCP-AQL spec reference generated from the specification repository.">
  <title>MCP-AQL Spec | Full Reference</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <header>
    <div class="container">
      <nav>
        <a class="logo" href="../index.html"><span class="logo-mark"></span>MCP-AQL</a>
        <ul class="nav-links">
          <li><a href="../index.html">Home</a></li>
          <li><a href="../docs/index.html">Docs</a></li>
          <li><a href="../launch-checklist.html">Launch Checklist</a></li>
          <li><a href="../apis/index.html">Adapter Patterns</a></li>
        </ul>
        <form class="site-search" data-search-form data-index-url="../data/search-index.json" role="search">
          <label class="sr-only" for="site-search-input">Search MCP-AQL docs</label>
          <input id="site-search-input" data-search-input type="search" placeholder="Search MCP-AQL docs, spec pages, and adapter patterns...">
          <span class="search-count" data-search-count></span>
          <ul class="search-results" data-search-results hidden></ul>
        </form>
      </nav>
    </div>
  </header>

  <main>
    <div class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="../index.html">Home</a></li>
          <li><span class="current">Full Spec</span></li>
        </ol>
      </nav>
      <section class="hero">
        <div class="hero-inner">
          <span class="status-pill">REPO-SYNCED SPEC REFERENCE</span>
          <h1>The deeper protocol docs now live on the website too</h1>
          <p class="lede">
            These pages are generated from <code>MCPAQL/spec</code> so the public site can carry the full protocol and adapter material,
            not just summaries and links back to GitHub.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="versions/v1.0.0-draft.html">Read The Normative Draft</a>
            <a class="btn btn-secondary" href="../docs/index.html">Back To Docs Library</a>
          </div>
        </div>
      </section>

      <section>
        <h2 class="section-title">How To Use This Section</h2>
        <div class="card">
          <ul>
            <li>Use the summary pages in <a href="../docs/index.html">Docs Library</a> for orientation and launch framing.</li>
            <li>Use this repo-synced reference for the fuller spec text hosted directly on the website.</li>
            <li>In case of conflict, the versioned draft under <code>versions/</code> remains the normative source.</li>
          </ul>
        </div>
      </section>

      ${sections}
    </div>
  </main>

  <footer>
    <div class="container">
      <p>&copy; 2026 DollhouseMCP Inc. d/b/a Dollhouse Research. MCP-AQL public draft documentation portal.</p>
      <div class="footer-links">
        <a href="../docs/index.html">Docs Library</a>
        <a href="https://github.com/MCPAQL/spec">Spec Repository</a>
        <a href="https://github.com/MCPAQL">MCPAQL Organization</a>
        <a href="https://dollhouseresearch.com">Dollhouse Research</a>
      </div>
    </div>
  </footer>

  <script src="../js/search.js"></script>
</body>
</html>
`;
}

function renderNavGroups(navGroups, currentOutputRel) {
  return navGroups.map((group) => {
    const links = group.entries.map((entry) => {
      const href = relativePathWithinPublic(currentOutputRel, entry.outputRel);
      const currentAttr = entry.outputRel === currentOutputRel ? " class=\"current\" aria-current=\"page\"" : "";
      return `<li><a${currentAttr} href="${href}">${escapeHtml(entry.title)}</a></li>`;
    }).join("");

    return `<div class="docs-side-group">
  <h3>${escapeHtml(group.category)}</h3>
  <ul>${links}</ul>
</div>`;
  }).join("");
}

function renderSpecPageNav(doc, navSequence) {
  const currentIndex = navSequence.findIndex((entry) => entry.outputRel === doc.outputRel);
  const previousDoc = currentIndex > 0 ? navSequence[currentIndex - 1] : null;
  const nextDoc = currentIndex >= 0 && currentIndex < navSequence.length - 1 ? navSequence[currentIndex + 1] : null;

  return renderPageNav({
    previous: previousDoc ? {
      href: relativePathWithinPublic(doc.outputRel, previousDoc.outputRel),
      eyebrow: "Previous spec page",
      label: previousDoc.title
    } : {
      href: relativePathFromDoc(doc.outputRel, "spec/index.html"),
      eyebrow: "Reference overview",
      label: "Full Spec Reference"
    },
    next: nextDoc ? {
      href: relativePathWithinPublic(doc.outputRel, nextDoc.outputRel),
      eyebrow: "Next spec page",
      label: nextDoc.title
    } : {
      href: relativePathFromDoc(doc.outputRel, "spec/index.html"),
      eyebrow: "Back to index",
      label: "Full Spec Reference"
    }
  });
}

function renderPageNav({ previous, next }) {
  return `<nav class="page-nav" aria-label="Page navigation">
  ${renderPageNavLink(previous, "prev")}
  ${renderPageNavLink(next, "next")}
</nav>`;
}

function renderPageNavLink(entry, direction) {
  return `<a class="page-nav-link ${direction}" href="${entry.href}">
    <span class="page-nav-eyebrow">${escapeHtml(entry.eyebrow)}</span>
    <strong class="page-nav-label">${escapeHtml(entry.label)}</strong>
  </a>`;
}

function buildKeywords(doc) {
  const pathWords = doc.sourceRepoRel
    .replace(/\.md$/i, "")
    .split(/[\/\-]/)
    .map((value) => value.toLowerCase())
    .filter(Boolean);

  const titleWords = doc.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  return Array.from(new Set([doc.category.toLowerCase(), "spec", ...pathWords, ...titleWords])).slice(0, 12);
}

function relativeAssetPath(currentOutputRel, assetRelFromPublic) {
  return relativePathWithinPublic(currentOutputRel, assetRelFromPublic);
}

function relativePathFromDoc(currentOutputRel, publicRel) {
  return relativePathWithinPublic(currentOutputRel, publicRel);
}

function relativePathWithinPublic(fromRel, toRel) {
  const relative = path.relative(path.dirname(fromRel), toRel).replace(/\\/g, "/");
  return relative || path.basename(toRel);
}

function writeFile(targetPath, content) {
  const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : null;
  if (existing === content) {
    return 0;
  }

  if (!isCheck) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
  }

  return 1;
}

function categoryFor(sourceRel) {
  const firstSegment = sourceRel.split("/")[0];
  const mapping = new Map([
    ["overview.md", "Core"],
    ["crude-pattern.md", "Core"],
    ["endpoint-modes.md", "Core"],
    ["introspection.md", "Core"],
    ["operations.md", "Core"],
    ["error-codes.md", "Core"],
    ["conformance-testing.md", "Core"],
    ["plugin-contracts.md", "Core"],
    ["versions", "Versions"],
    ["adapter", "Adapter"],
    ["security", "Security"],
    ["features", "Features"],
    ["guides", "Guides"],
    ["process", "Process"],
    ["architecture", "Architecture"],
    ["research", "Research"],
    ["reference", "Reference"],
    ["adr", "ADRs"]
  ]);

  return mapping.get(firstSegment) || mapping.get(path.basename(sourceRel)) || "Core";
}

function stripMarkdown(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/[_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitFrontMatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    return { metadata: {}, body: markdown };
  }

  const endIndex = markdown.indexOf("\n---\n", 4);
  if (endIndex < 0) {
    return { metadata: {}, body: markdown };
  }

  const rawFrontMatter = markdown.slice(4, endIndex);
  const body = markdown.slice(endIndex + 5);
  const metadata = {};

  for (const line of rawFrontMatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!match) {
      continue;
    }

    metadata[match[1].trim().toLowerCase()] = match[2].trim().replace(/^["']|["']$/g, "");
  }

  return { metadata, body };
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
