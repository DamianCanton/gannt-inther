# Skill Registry: gannt-inther

## Project Conventions

- `AGENTS.md` — source of truth for stack conventions (Next.js App Router + strict TypeScript + Tailwind + Supabase), naming, testing commands, and architecture constraints.
- `DESIGN.md` — design system documentation with INTHER brand colors, Bento Grid patterns, and UI/UX guidelines.
- `DOCS/PROYECTO GANNT.md` — architecture blueprint with domain rules (domino scheduling, business-day calculations, DAG dependencies, print/export split).

## Project-Level Skills

| Skill | Trigger |
|-------|---------|
| `frontend-design` | Building/styling frontend pages/components with distinctive visual direction |
| `ui-ux-pro-max` | UI/UX structure, accessibility, interaction quality, and visual decision-making |
| `vercel-react-best-practices` | React/Next.js performance, rendering, bundle, and data-fetching optimization |
| `supabase` | Supabase products (Database, Auth, Edge Functions, Realtime, Storage) |
| `supabase-postgres-best-practices` | Postgres performance optimization and best practices |
| `react-best-practices` | React patterns for hooks, effects, refs, and component design |
| `tailwind-design-system` | Build scalable design systems with Tailwind CSS v4 |

## User-Level Skills (Global)

| Skill | Trigger |
|-------|---------|
| `sdd-init` | Initialize Spec-Driven Development context |
| `sdd-explore` | Explore and investigate ideas before committing to a change |
| `sdd-propose` | Create a change proposal with intent, scope, and approach |
| `sdd-spec` | Write specifications with requirements and scenarios |
| `sdd-design` | Create technical design document with architecture decisions |
| `sdd-tasks` | Break down a change into an implementation task checklist |
| `sdd-apply` | Implement tasks from the change, writing actual code |
| `sdd-verify` | Validate that implementation matches specs, design, and tasks |
| `sdd-archive` | Sync delta specs to main specs and archive a completed change |
| `sdd-onboard` | Guided end-to-end walkthrough of the SDD workflow |
| `skill-registry` | Create or update the skill registry for the current project |
| `skill-creator` | Create new AI agent skills following the Agent Skills spec |
| `branch-pr` | PR creation and branch workflow support |
| `issue-creation` | Structured GitHub issue creation workflow |
| `go-testing` | Go testing patterns (including Bubbletea-focused flows) |
| `judgment-day` | Dual adversarial review workflow |
| `brand-voice` | Apply and enforce brand voice, style guide, and messaging |
| `escalation` | Structure and package support escalations |
| `agent-browser` | Browser automation CLI for AI agents |
| `firecrawl-scraper` | Web scraping using Firecrawl API |
| `theme-factory` | Toolkit for styling artifacts with a theme |
| `obsidian-markdown` | Create and edit Obsidian Flavored Markdown |
| `excalidraw-diagram-generator` | Generate Excalidraw diagrams from natural language |
| `market-research-reports` | Generate comprehensive market research reports |
| `xlsx` | Spreadsheet file operations (read, edit, create, convert) |
| `prd` | Generate Product Requirements Documents |
| `find-skills` | Discover and install agent skills |
| `ui-ux-pro-max` | UI/UX design intelligence for web and mobile |
| `vercel-react-best-practices` | React and Next.js performance optimization |

## Active SDD Context

- **Persistence Mode**: engram
- **Project**: gannt-inther
- **Initialized**: 2026-04-27
- **Last Updated**: 2026-04-27
- **Strict TDD Mode**: enabled ✅
- **Test Runner**: Vitest 2.x with jsdom environment
- **Stack**: Next.js 14 + TypeScript 5.4 (Strict) + Tailwind CSS 3.4 + Supabase

## Testing Capabilities Summary

| Layer | Available | Tool |
|-------|-----------|------|
| Unit | ✅ | Vitest + jsdom |
| Integration | ✅ | @testing-library/react |
| E2E | ✅ | Playwright |
| Coverage | ✅ | @vitest/coverage-v8 |
| Type Check | ✅ | tsc --noEmit |
| Lint | ✅ | ESLint (next/core-web-vitals) |

## Notes

- Deduplication: Project-level skills override user-level skills with same name
- SDD skills (sdd-*) are system infrastructure and always available
- Skill discovery: Run `find-skills` to search for additional capabilities
- Test files follow pattern: `**/__tests__/**/*.test.ts` or `**/__tests__/**/*.test.tsx`
- E2E tests located in: `./e2e/` directory
