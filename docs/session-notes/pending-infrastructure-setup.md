# Pending Work: Infrastructure Setup

## Summary
Infrastructure setup for the website repository - the public-facing website for MCP-AQL documentation and resources.

## Current State
- Repository exists with basic structure
- No CI/CD workflows
- No branch protection or git flow
- Issues #2-7 created to track infrastructure work

## Work To Complete

### 1. Git Flow Setup (Issue #2)
**Purpose**: Establish consistent branching strategy

Tasks:
- Create `develop` branch from `main`
- Configure branch protection
- `main` deploys to production
- `develop` deploys to staging/preview

### 2. Build and Deploy Workflow (Issue #3)
**Purpose**: Automated website deployment

Tasks:
- Create `.github/workflows/deploy.yml`
- Triggers:
  - Push to `main` → Deploy to production
  - Push to `develop` → Deploy to staging/preview
  - Pull requests → Build only (no deploy)
- Choose hosting platform:
  - GitHub Pages (simple, free)
  - Cloudflare Pages (fast, preview URLs)
  - Vercel (good framework support)
  - Netlify (similar to Vercel)

Considerations:
- Preview deployments for PRs
- Custom domain setup
- Build caching

### 3. Link Checking Workflow (Issue #4)
**Purpose**: Detect broken links

Tasks:
- Create `.github/workflows/link-check.yml`
- Run on PRs
- Weekly scheduled check
- Post-deploy verification
- Use lychee for fast checking

### 4. Lighthouse CI Workflow (Issue #5)
**Purpose**: Monitor performance and accessibility

Tasks:
- Create `.github/workflows/lighthouse.yml`
- Run on PRs (compare against baseline)
- Push to `main` updates baseline
- Track metrics:
  - Performance (Core Web Vitals)
  - Accessibility
  - Best Practices
  - SEO

Suggested thresholds:
```yaml
assertions:
  performance: 90
  accessibility: 100
  best-practices: 90
  seo: 90
```

### 5. Issue and PR Templates (Issue #6)
**Purpose**: Standardize contributions

Tasks:
- Bug report template (broken page, display issue)
- Content request template (new page, section)
- PR template with screenshot requirements for visual changes

### 6. CODEOWNERS (Issue #7)
**Purpose**: Automatic review assignment

Tasks:
- Create `.github/CODEOWNERS`
- Note: Requires GitHub teams

## Prerequisites

- GitHub teams for CODEOWNERS
- Hosting platform decision
- Custom domain (if applicable)
- Branch protection requires GitHub Pro for private repos

## Recommended Order

1. Build and deploy workflow (#3) - Core functionality
2. Link checking (#4) - Quality assurance
3. Git flow (#2) - Can require CI in protection
4. Lighthouse CI (#5) - Performance monitoring
5. Templates (#6) and CODEOWNERS (#7)

## Hosting Decision

Need to decide on hosting platform before implementing deploy workflow:

| Platform | Pros | Cons |
|----------|------|------|
| GitHub Pages | Free, simple | No native preview URLs |
| Cloudflare Pages | Fast, free tier, preview URLs | Another service to manage |
| Vercel | Great DX, preview URLs | May have limits |
| Netlify | Similar to Vercel | May have limits |

## Reference

See `MCPAQL/spec` repository for examples of completed infrastructure.
