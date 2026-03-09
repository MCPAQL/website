# MCP-AQL Pre-Launch Readiness Review

Reviewed: 2026-03-09
Scope: `MCPAQL/spec`, `MCPAQL/website`, Dollhouse practical profile alignment (public-facing view)

## Executive Status

Overall status: **Yellow (near-launch with explicit draft framing)**

- **Green:** Core draft positioning and normative/informative boundaries are now clear in `spec`.
- **Yellow:** Known launch-gate issues remain open and should be visible in public messaging.
- **Yellow:** Website/docs portal is now materially improved but still early-stage and should continue iterating post-launch.

## Track 1: Spec Draft Readiness

Live issue state indicates remaining pre-launch work:

- [MCPAQL/spec#193](https://github.com/MCPAQL/spec/issues/193): MCP capability audit
- [MCPAQL/spec#197](https://github.com/MCPAQL/spec/issues/197): batch/resource safeguards
- [MCPAQL/spec#199](https://github.com/MCPAQL/spec/issues/199): structured error alignment
- [MCPAQL/spec#194](https://github.com/MCPAQL/spec/issues/194): release epic coordination

Recommendation:

1. Keep launch language explicitly "preliminary public draft"
2. Publish with known-open-items section
3. Treat `v1.0.0-draft` as the normative source, not a final certification baseline

## Track 2: Dollhouse Practical Profile Alignment

The profile remains highly valuable and still has active alignment work.
Private development tracking exists, but public documentation should reference only:

- [DollhouseMCP production server](https://github.com/DollhouseMCP/mcp-server)
- [Dollhouse research site](https://dollhousemcp.com)

Recommendation:

1. Keep explicit "practical reference profile" language
2. Document intentional deltas from generic protocol behavior
3. Prioritize structured error and batch safeguards for launch trust

## Track 3: Public Documentation Surface (Website)

Status before update: minimal placeholder site.

Status after this update:

- Added launch positioning and readiness sections on the home page
- Replaced placeholder API pages with usable integration guidance
- Updated links to current spec and Dollhouse repositories
- Added repository map and browse-first navigation

Recommendation:

1. Add dedicated pages for conformance and error model details
2. Add architecture diagrams and end-to-end examples
3. Add release notes page synchronized with `spec` changelog highlights

## Go/No-Go Guidance

Go for preliminary public draft launch **if**:

- public messaging remains explicit that this is a draft,
- live issue links are visible,
- practical profile distinction is preserved.

Do not frame as final or certified spec until core launch-gate issues are closed.
