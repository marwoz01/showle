# User profiles

The account name/avatar opens `/profile`. The four tabs contain:

- **Overview:** up to four favorite movies, watched/watchlist counts, total runtime of watched movies, average rating, top genres, daily-game statistics, account higher/lower record, recent collection activity, distinct achievement badges and an inline movie-taste comparison. Select an accepted friend or paste a profile/invitation link or code to compare directly in the overview.
- **Taste and platforms:** preferred/excluded genres, Polish VOD providers and maximum runtime. Saved settings initialize solo recommendations and new shared-choice preferences. Existing room settings take precedence; users can change filters for a particular session. Resetting recommendation feedback preserves collection ratings and reviews.
- **Friends:** invitations, public-profile search, friends/following/follower lists and movie activity. See [social.md](social.md) for visibility rules.
- **Settings:** Showle nickname/bio, Clerk account management (including avatar), synchronized Polish/English language, public-profile visibility, data export and app-data deletion.

Profile creation is lazy and private by default. Nicknames initially use Clerk username/first name, never email; avatars come from the verified Clerk user. A new profile keeps the browser's `showle-locale` preference. Existing account language is loaded on login and subsequent language changes persist across devices.

The profile gem panel is currently hidden. Game badges still display their gem rewards and whether they were credited; collection badges do not grant gems. On desktop and mobile, a blue gem icon and balance sit beside the streak flame without a visible label, border or link. See [gems.md](gems.md) for earning rules and persistence.

## API and privacy

Private endpoints derive ownership only from the verified Clerk session, use bounded inputs/rate limits and return `Cache-Control: private, no-store`.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/profile` | Profile, aggregate summary, 12 latest collection activity entries and badge progress. Games remain in their dedicated statistics/history pages. |
| `PATCH /api/profile` | Partial update of `displayName` (1-40 characters), `bio` (up to 280), `isPublic` and up to four unique `favoriteMovieIds`. Favorite metadata is resolved from the server catalog/TMDB. |
| `GET /api/profile/preferences` | `{ preferences: { genres, excludedGenres, providerIds, maxRuntime }, locale }`. |
| `PATCH /api/profile/preferences` | Partial settings/language update. Unknown genres/providers, overlaps and runtime outside 40-360 minutes are rejected; `null` clears the runtime limit. A transaction lock also prevents concurrent updates creating an overlap. |
| `POST /api/profile/preferences` | `{ "action": "reset-feedback" }` removes only the current user's recommendation reactions. |
| `GET /api/profile/export?format=json\|csv` | Downloads all app-account data as JSON, or the complete collection as CSV. |
| `DELETE /api/profile/data` | Requires `{ "confirmation": "DELETE SHOWLE DATA" }`; deletes the current user's app data atomically. |
| `GET /api/user/higher-lower-record` | Account best score. |
| `POST /api/user/higher-lower-record` | Accepts a signed run token, verifies its score and atomically retains the maximum. It does not trust a client-supplied score. |

Public profiles at `/u/[slug]` are opt-in. `GET /api/profiles/[slug]` exposes nickname, bio, avatar, four favorites, watched count/total runtime, game statistics and unlocked badges. Recent watched films and ratings have their own activity visibility control. Clerk user ID, email, preferences, written reviews and watchlists remain private. Private profiles return 404 to strangers; accepted friends can still view their movie profile. The response is not cached, and visibility is rechecked after aggregate queries.

`GET /api/profiles/[slug]/compare` requires login and a different public profile or accepted friend. It returns common favorites, an aggregate similarity score (only with at least three shared ratings), and up to three joint suggestions. The score is `100 × (1 − mean absolute rating gap / 9.5)`, rounded to an integer. Similar opinions have a gap of at most 1 point; different opinions have a gap of at least 3. The response includes their counts and the average gap. These aggregates are withheld for fewer than three shared ratings when detailed ratings are private.

Up to four examples in each opinion group show both ratings only when the other person's activity visibility permits it and their film is marked watched. High-rated shared films follow the same visibility rule; otherwise only explicitly shared favorite-four snapshots are returned. Watchlists and written reviews remain private. Permissions are checked again after queries. Suggestions exclude either person's watched/negatively rated films and feedback, respect both genre exclusions, the shorter runtime limit, and each person's selected providers. The similarity percentage measures agreement, not predictive accuracy. The UI clears results and cancels pending requests when switching target, account or language.

Badges are computed from existing progress: first watched film, 50 watched films, first daily win, a seven-day best daily streak and a higher/lower score of 10. No separate achievement ledger is stored.

## Export and reset

JSON export reads a consistent database snapshot containing profile, every collection item, rankings and their items, game history/statistics, feedback, wallet, transactions, higher/lower record and owned recommendation usage. Answers to unfinished daily games are omitted. CSV includes every collection row, quotes multiline fields and neutralizes spreadsheet formula prefixes.

Deletion removes those account-owned records, with ranking items removed by cascade. It does not delete the Clerk account or unrelated anonymous rooms. The response expires the `showle-player` cookie to prevent anonymous daily progress being adopted again; the UI clears the account's local daily progress, recommendation reactions and higher/lower storage. Visiting the profile afterward creates a fresh private profile. The UI requires typed confirmation before making this request.

## Database deployment

`prisma/migrations/20260922_user_profiles/migration.sql` additively creates `UserProfile` and `HigherLowerRecord`. Generate the matching Prisma client and apply this migration to the intended database **before deploying routes that use these tables**. Do not run a schema reset or apply unrelated historical migrations blindly. The checked-in SQL was verified with the real Prisma/Neon adapter against an isolated loopback PostgreSQL cluster, then applied transactionally to the configured application database on 2026-09-22. Both tables, their 18 columns and the unique public-slug index were verified; existing application records were unchanged.

Targeted validation: `user-profile-input.test.ts`, `user-profile-api.test.ts`, `user-profile-postgres.integration.test.ts`, `public-profile-api.test.ts`, `profile-comparison.test.ts`, `higher-lower-record.test.ts` and `profile-preference-integration.test.ts`. The PostgreSQL profile suite is opt-in through `SHOWLE_PROFILE_PG_URL=postgresql://showle_security@127.0.0.1:55439/showle_security_fix`; it refuses other targets and never reads application environment files.
