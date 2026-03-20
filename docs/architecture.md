# Architecture

## Folder Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── game/
│   │   │   ├── complete/       # POST - finish game, update stats (transactional)
│   │   │   └── state/          # GET/PUT - save/load game progress
│   │   ├── movies/
│   │   │   ├── daily/          # GET - today's movie (cached 5min)
│   │   │   ├── search/         # GET - search movies via TMDB
│   │   │   └── details/        # GET - single movie details
│   │   └── user/
│   │       └── stats/          # GET - user statistics
│   ├── play/movie/             # Game page
│   ├── sign-in/[[...sign-in]]/ # Clerk sign-in
│   ├── sign-up/[[...sign-up]]/ # Clerk sign-up
│   ├── stats/                  # User stats page
│   ├── layout.tsx              # Root layout (ClerkProvider, I18nProvider, Sidebar)
│   ├── page.tsx                # Home page (game mode cards)
│   └── globals.css             # Theme tokens, animations
│
├── components/
│   ├── game/                   # SearchBar, GuessCard, ComparisonTable, HintsPanel, ResultScreen, CountdownTimer
│   ├── home/                   # GameModeCard, HowItWorks
│   ├── layout/                 # Sidebar
│   └── ui/                     # Reusable primitives (currently empty)
│
├── hooks/
│   └── useGame.ts              # Core game state machine (localStorage + server sync)
│
├── lib/
│   ├── comparer.ts             # 8-field comparison engine
│   ├── daily.ts                # Daily movie selection (deterministic hash, 90-day no-repeat)
│   ├── hints.ts                # Progressive hint system (reveal at attempts 2, 4, 6)
│   ├── prisma.ts               # Prisma client singleton
│   └── tmdb.ts                 # TMDB API wrapper
│
├── i18n/                       # Translations (pl.ts, en.ts, context provider)
├── types/                      # Shared TypeScript interfaces
├── constants/                  # Game config (MAX_ATTEMPTS=7, modes, labels)
└── data/
    └── eligible-movies.json    # Curated pool of 4941 TMDB movie IDs

prisma/
└── schema.prisma               # GameResult + UserStats models
```

## Main Modules

### Game Engine (`lib/comparer.ts`, `lib/hints.ts`, `hooks/useGame.ts`)
- `compareMedia()` compares 8 fields: year, genres, country, director, runtime, budget, popularity, rating
- Each field returns `exact` / `partial` / `miss` status + optional `up`/`down` direction
- Hints reveal at attempts 2 (genres), 4 (director), 6 (tagline/overview)
- `useGame` hook manages full game lifecycle: restore → play → sync → complete

### Daily Selection (`lib/daily.ts`)
- Deterministic hash of date string selects movie from 4941-entry pool
- 90-day sliding window prevents repeats
- Warsaw timezone (Europe/Warsaw) defines "today"

### Persistence (`hooks/useGame.ts`, API routes)
- **Primary**: localStorage (works without auth)
- **Secondary**: Server sync for logged-in users (game state + completion)
- Game completion writes `GameResult` + updates `UserStats` in a single Prisma transaction

### Auth (Clerk)
- `clerkMiddleware` protects `/api/game/*` and `/api/user/*`
- Public routes: `/`, `/sign-in`, `/sign-up`, `/play/*`, `/api/movies/*`
- `userId` from Clerk stored directly in `GameResult.userId` and `UserStats.userId`

## Data Flow

```
User types movie name
  → SearchBar (300ms debounce + AbortController)
  → GET /api/movies/search
  → TMDB /search/movie → filter (votes≥50) → top 6 → fetch details
  → Return MediaDetails[]

User selects a guess
  → useGame.submitGuess()
  → compareMedia(guess, answer) → ComparisonField[]
  → Save to localStorage
  → If logged in: PUT /api/game/state (or POST /api/game/complete if finished)
  → If complete: update UserStats in transaction, dispatch "game-completed" event

Daily movie loading
  → GET /api/movies/daily?dateKey=YYYY-MM-DD
  → hashDate(dateKey) → index into eligible-movies.json
  → TMDB /movie/{id} + /movie/{id}/credits
  → Cache: CDN 5min, TMDB responses 1hr
```

## Key Architectural Decisions

- **localStorage-first persistence**: Game works without login. Server sync is fire-and-forget.
- **No User model in Prisma**: Clerk owns user data. DB only stores game-related data with Clerk userId as foreign key.
- **Static movie pool**: 4941 pre-curated movie IDs in JSON. No runtime filtering of TMDB catalog.
- **Deterministic daily selection**: Same date always produces same movie, regardless of server. Pure function of date string.
- **Client components for game pages**: Game state is inherently client-side (localStorage, user interaction). API routes handle server logic.
