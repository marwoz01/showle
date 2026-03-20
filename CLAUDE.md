# Showle — AI Context

Daily movie guessing game. Next.js 16 + TypeScript + Tailwind v4 + Clerk + Prisma/Neon.

## Quick Reference

- **Docs**: See `docs/` for full project documentation
  - `docs/project.md` — overview, stack, how to run
  - `docs/architecture.md` — folder structure, modules, data flow
  - `docs/decisions.md` — technical decisions with reasoning
  - `docs/design.md` — colors, typography, component patterns
  - `docs/rules.md` — coding conventions and AI guidelines
  - `docs/tasks.md` — current TODO / in progress / done

## Critical Rules

- Dark mode only. No light mode.
- All user-facing strings must use i18n (`useTranslation()` → `t.section.key`)
- Auth: Clerk only. `auth()` from `@clerk/nextjs/server` for API routes, `useAuth()`/`useUser()` for client
- No new dependencies without approval
- Tailwind utility classes only — no CSS modules, no styled-components
- Icons: Lucide React only
- Imports: always use `@/` alias, never relative paths
- Purple (`#7c4dff`) is the only accent color for interactive elements
