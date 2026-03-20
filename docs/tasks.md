# Tasks

## TODO

### Error Tracking
- [ ] Integrate Sentry for error monitoring
- [ ] Add error boundaries for client components
- [ ] Structured error logging in API routes

### SEO & Social
- [ ] Add Open Graph meta tags (title, description, image)
- [ ] Create `robots.txt` and `sitemap.xml`
- [ ] Add social sharing preview image

### Security
- [ ] Add rate limiting on `/api/movies/search` (public, abuse-prone)
- [ ] Add CSP headers in `next.config.ts`
- [ ] Remove committed `.env` from git history (contains DATABASE_URL)

### Testing
- [ ] Set up Vitest
- [ ] Unit tests for `lib/comparer.ts` (comparison logic)
- [ ] Unit tests for `lib/daily.ts` (deterministic selection, no-repeat window)
- [ ] Unit tests for `lib/hints.ts` (hint generation and reveal logic)
- [ ] API route integration tests

### Features
- [ ] Series mode (`/play/series`) — daily TV series guessing
- [ ] Unlimited mode (`/play/unlimited`) — play as many as you want
- [ ] Pro subscription system (Stripe integration)
- [ ] Share result as image/text to social media
- [ ] Game history page (past results)

## IN PROGRESS

_(nothing currently)_

## DONE

- [x] Core daily movie game mode
- [x] 8-field comparison engine (year, genres, country, director, runtime, budget, popularity, rating)
- [x] Progressive hint system (3 hints at attempts 2, 4, 6)
- [x] User authentication (Clerk)
- [x] Game state persistence (localStorage + server sync)
- [x] User statistics tracking (games played, won, streaks, average)
- [x] Responsive sidebar navigation
- [x] i18n support (Polish + English)
- [x] Countdown timer to next daily reset
- [x] Streak tracking with animated flame
- [x] Auth pages with decorative blob animations
- [x] Migrate from NextAuth to Clerk
- [x] Wrap game completion in Prisma transaction
- [x] Create `.env.example`
