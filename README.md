# MCP-AQL Website

Static website for the MCP-AQL public draft documentation portal.

[![Pages deploy](https://github.com/MCPAQL/website/actions/workflows/static.yml/badge.svg)](https://github.com/MCPAQL/website/actions/workflows/static.yml)
[![Website quality](https://github.com/MCPAQL/website/actions/workflows/website-quality.yml/badge.svg)](https://github.com/MCPAQL/website/actions/workflows/website-quality.yml)
[![Link check](https://github.com/MCPAQL/website/actions/workflows/link-check.yml/badge.svg)](https://github.com/MCPAQL/website/actions/workflows/link-check.yml)
[![Lighthouse CI](https://github.com/MCPAQL/website/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/MCPAQL/website/actions/workflows/lighthouse.yml)

## Purpose

This repository hosts browse-first web documentation for MCP-AQL so users can:

- Understand protocol goals and launch positioning
- Navigate protocol, security, conformance, and implementation guidance without cloning repos
- Track launch readiness through public-facing status pages
- Discover canonical spec docs and practical implementation references
- Search documentation content directly within the site

## Source Of Truth

- Canonical normative protocol text: <https://github.com/MCPAQL/spec>
- Practical reference profile context: <https://github.com/DollhouseMCP/mcp-server>
- Public research/site context: <https://dollhouseresearch.com>

## Site Structure

All web assets are under `public/`:

- `public/index.html`: portal home and repository map
- `public/docs/*.html`: protocol library pages (getting started, core, error model, security, conformance, adapter contracts, profiles, roadmap, release notes)
- `public/launch-checklist.html`: public launch readiness summary
- `public/apis/*.html`: integration-surface guidance pages
- `public/css/style.css`: shared styles and responsive layout
- `public/js/search.js`: client-side documentation search
- `public/data/search-index.json`: search index catalog
- `docs/prelaunch-readiness-review.md`: launch readiness assessment and guidance

## Local Preview

```bash
cd public
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deployment

GitHub Pages deploys automatically from `main` using `.github/workflows/static.yml`.
The workflow publishes only the `public/` directory.

Preview/build behavior:

- Pull requests build the static site artifact and run CI checks.
- Content PRs also run `visidelta-preview.yml` for rendered diff previews.
- `develop` is reserved for shared preview integration once the branch and protections are enabled on GitHub.

## CI Checks

Pull requests and pushes to `main` or `develop` run `.github/workflows/website-quality.yml`:

- Markdown linting (`markdownlint-cli2`)
- HTML linting for files under `public/` (`htmlhint`)

Pull requests, pushes to `main` or `develop`, and weekly scheduled runs execute `.github/workflows/link-check.yml`:

- Link checks across Markdown and HTML (`lychee`)
- Weekly drift detection for external and internal links

Pull requests touching site content and pushes to `main` run `.github/workflows/lighthouse.yml`:

- Lighthouse CI audits for performance, accessibility, best practices, and SEO
- Artifact upload plus temporary public report storage for review

Pull requests that modify site content also run `.github/workflows/visidelta-preview.yml`:

- Builds rendered visual diffs with VisiDelta
- Uploads an artifact for each run (`visidelta-<run_id>-<attempt>`)
- Optionally publishes hosted previews when `VISIDELTA_PREVIEW_PAGES_TOKEN` is configured

## License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See `LICENSE`.

Commercial licenses are available. See `COMMERCIAL-LICENSE.md` or contact `licensing@mcpaql.org`.
