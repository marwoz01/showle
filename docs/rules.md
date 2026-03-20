# AI Coding Rules

## Code Style

- TypeScript strict mode — no `any`, no `@ts-ignore`
- Functional components only, no class components
- Use `"use client"` only when the component needs browser APIs, hooks, or interactivity
- Prefer named exports for utilities, default exports for page/layout components
- Destructure props inline: `function Foo({ bar }: { bar: string })` for simple props
- Use `interface` for component props, `type` for unions and utility types
- Keep files under 200 lines. If a component grows beyond that, extract sub-components

## Naming Conventions

- **Files**: PascalCase for components (`GuessCard.tsx`), camelCase for utilities (`comparer.ts`)
- **Components**: PascalCase (`SearchBar`, `HintsPanel`)
- **Hooks**: `use` prefix, camelCase (`useGame`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ATTEMPTS`)
- **Types**: PascalCase (`MediaDetails`, `GameStatus`)
- **CSS variables**: kebab-case (`--color-accent-purple`)
- **API routes**: kebab-case directories (`/api/game/complete`)
- **Database fields**: camelCase in Prisma schema (`dateKey`, `attemptCount`)

## Preferred Approaches

- **Styling**: Tailwind utility classes. No CSS modules, no styled-components, no inline `style` objects (except dynamic values like gradients)
- **State management**: React hooks + context. No Redux, no Zustand, no external state libraries
- **Data fetching**: `fetch` in `useEffect` for client components, direct `fetch` in API routes. No SWR, no React Query
- **Icons**: Lucide React only. Never import from other icon libraries
- **Translations**: Always use `t.section.key` pattern from `useTranslation()`. Never hardcode user-facing strings (except brand name "Showle")
- **Error handling**: try-catch in async functions, return `NextResponse.json({ error }, { status })` in API routes. Log with `console.error` server-side
- **Auth checks**: `const { userId } = await auth()` from `@clerk/nextjs/server` in API routes, `useAuth()` or `useUser()` from `@clerk/nextjs` in client components

## What to Avoid

- **No new dependencies** without explicit approval — the stack is intentionally minimal
- **No Framer Motion** — use CSS animations via Tailwind or `globals.css`
- **No `any` type** — always type properly
- **No barrel exports** — import directly from the source file
- **No relative imports** — use `@/` path alias always
- **No `console.log`** in committed code — use `console.error` for actual errors only
- **No comments** for self-explanatory code — only comment "why", never "what"
- **No over-engineering** — no abstractions for single-use code, no premature generalization
- **No light mode** — dark only, do not add theme switching
- **No new colors** — use existing theme tokens from `globals.css`

## API Route Patterns

```typescript
// Standard protected API route
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... logic
}
```

## Component Patterns

```typescript
// Standard client component
"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n";
import { SomeIcon } from "lucide-react";

export default function MyComponent() {
  const { t } = useTranslation();
  // ... component logic
}
```

## Database Patterns

- Always use Prisma transactions when updating multiple related records
- Use `upsert` for idempotent writes (game state saves)
- `userId` is always Clerk's user ID string (format: `user_xxxxx`)
- Composite unique keys for one-per-user-per-day constraints: `@@unique([userId, dateKey, mode])`

## i18n Rules

- Every user-facing string must go through translations (`src/i18n/pl.ts` and `src/i18n/en.ts`)
- Add new keys to both language files simultaneously
- Use function interpolation for dynamic content: `wonMessage: (title: string, attempts: number) => string`
- Type all translation keys in `src/i18n/types.ts`
