# Design System

## Colors

| Token              | Hex       | Usage                                    |
| ------------------ | --------- | ---------------------------------------- |
| `background`       | `#101012` | Page background                          |
| `foreground`       | `#f0f0f5` | Primary text                             |
| `card`             | `#151517` | Card/panel backgrounds                   |
| `card-hover`       | `#1a1a1d` | Card hover state                         |
| `card-border`      | `#252528` | Card borders                             |
| `muted`            | `#8a8a9a` | Secondary text, labels, placeholders     |
| `accent-purple`    | `#7c4dff` | Primary accent — active states, buttons, links, streaks |
| `accent-green`     | `#00e676` | Success states                           |
| `accent-cyan`      | `#00bcd4` | Reserved / decorative                    |
| `match-exact`      | `#00e676` | Exact match in comparison                |
| `match-partial`    | `#ffc107` | Partial match (close but not exact)      |
| `match-miss`       | `#ff5252` | No match / error states / give up button |

All colors defined as CSS custom properties in `src/app/globals.css` via `@theme inline`.

### Accent color rule
Purple (`#7c4dff`) is the **only** accent color used for interactive elements. Green, yellow, red are reserved for game match feedback. Do not introduce new accent colors.

## Typography

| Role    | Font           | Variable              | Usage                        |
| ------- | -------------- | --------------------- | ---------------------------- |
| Body    | Inter          | `--font-sans`         | All body text, inputs, labels |
| Display | Space Grotesk  | `--font-display`      | Headings, logo, game titles  |

### Size conventions
- Page titles: `text-2xl` or `text-4xl` + `font-bold`
- Section headings: `text-sm font-semibold`
- Body text: `text-sm`
- Labels/captions: `text-xs`
- Stat values: `text-2xl font-bold`

## Spacing & Layout

- Page padding: `p-4 pt-16` (mobile), `p-10` (desktop, `lg:`)
- Sidebar: fixed left, `w-60` on desktop, `w-72 max-w-[85vw]` on mobile (slides in)
- Main content: `lg:ml-60` to clear sidebar
- Card padding: `p-4` or `p-5`
- Card border-radius: `rounded-xl` or `rounded-2xl`
- Section gaps: `space-y-8` between major sections, `space-y-4` within
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for cards, `lg:grid-cols-4` for stats

## UI Style

**Dark mode only**. No light mode.

Style: **Minimal dark UI with subtle glassmorphism**
- Cards use `bg-card` with `border border-white/6`
- Hover states use `bg-white/4` or `bg-white/6`
- Inputs: `bg-white/3 border-white/8`, focus: `border-accent-purple/50`
- Buttons: ghost style with `border border-white/6 bg-white/3` or filled with `bg-accent-purple`
- Pro button: gradient `from-accent-purple to-[#a855f7]`
- Decorative blobs on auth pages: large blurred circles with purple tones, animated

## Animations

| Name            | Duration | Usage                                |
| --------------- | -------- | ------------------------------------ |
| `animate-flame` | 1.5s     | Streak flame icon flicker            |
| `animate-blob-*`| 7-11s    | Auth page decorative background blobs |
| `animate-spin`  | built-in | Loading spinners (Loader2 icon)      |

### Animation rules
- Use CSS animations, not Framer Motion
- Keep animations subtle and purposeful — no gratuitous motion
- Loading states always use `Loader2` icon with `animate-spin`
- Transitions on interactive elements: `transition-colors` (default duration)

## Component Patterns

### Buttons
- **Primary**: `bg-accent-purple text-white rounded-lg px-6 py-2.5 text-sm font-medium`
- **Ghost**: `border border-white/6 bg-white/3 text-foreground rounded-lg px-4 py-2.5 text-sm font-medium`
- **Danger**: `border border-match-miss/30 text-match-miss` (give up button)
- **Disabled**: `disabled:opacity-50 cursor-default`

### Cards
- `rounded-xl border border-white/6 bg-card p-5`
- Dashed empty state: `rounded-2xl border border-dashed border-white/8 p-8 text-center text-sm text-muted`

### Inputs
- `w-full rounded-lg border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none transition-colors focus:border-accent-purple/50`

### Icons
- Library: Lucide React (always)
- Default size: `size={16}` in text, `size={18-22}` standalone
- Color: inherit from text or explicit `text-accent-purple`, `text-muted`
