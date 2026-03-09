# MCP-AQL Website

Static website for the MCP-AQL public draft documentation portal.

## Purpose

This repository hosts browse-first web documentation for MCP-AQL so users can:

- Understand protocol goals and launch positioning
- Navigate integration guidance without cloning the spec repo
- Follow live readiness gates through linked issues
- Discover canonical spec docs and practical implementation references

## Source Of Truth

- Canonical normative protocol text: <https://github.com/MCPAQL/spec>
- Practical reference profile context: <https://github.com/DollhouseMCP/mcp-server-v2-refactor>

## Site Structure

All web assets are under `public/`:

- `public/index.html`: launch overview, readiness gates, repo map
- `public/apis/*.html`: integration-surface guidance pages
- `public/css/style.css`: shared styles and responsive layout
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

## License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). See `LICENSE`.

Commercial licenses are available. See `COMMERCIAL-LICENSE.md` or contact `licensing@mcpaql.org`.
