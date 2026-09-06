# Recommendation system

## Runtime flow

1. Validate a bounded request, reject contradictory explicit preferences, then reserve the existing daily quota atomically.
2. Infer word-boundary PL/EN genre negations locally and translate the description using `google/gemini-2.5-flash-lite`. The model can be overridden with `RECOMMENDATION_CHAT_MODEL`.
3. Load the authenticated viewer's watched IDs, ratings and explicit feedback. Resolve the reference film from canonical catalog/TMDB data.
4. Retrieve up to 60 candidates from `RecommendationMovie`. Both vector and lexical fallback queries enforce the same years, genres, exclusions, vote-count range, runtime, Polish subscription providers and already-shown IDs.
5. Pre-rank and diversify a 24-film shortlist using similarity, Bayesian audience rating, taste and reference-film metadata. Review description/reference relevance against bounded public plots and keywords. Unsupported/contradictory matches are removed when that review is available.
6. Rank at most eight final films, penalizing repeated franchises/directors. Recheck all hard filters. Build explanations from verified metadata, not generated claims.
7. Return localized metadata, quota and matching/interpretation/relevance status. Never silently refill from previously displayed films or relax filters.

AI interpretation and relevance review each have a 6-second deadline, no automatic retry and bounded output. The embedding call also has a 6-second deadline. The browser stops waiting after 25 seconds. History, individual ratings, account identifiers and feedback records are never sent to AI. The relevance reviewer receives public candidate facts and the user's search description/reference only.

Genre selections mean **any selected genre**. Excluded genres mean **none of them**. Provider selections mean an active subscription listing on **any selected provider in Poland**, not rentals. Runtime excludes unknown durations when capped. Popularity bands use vote counts: hits >= 5000; medium 1000-4999; niche < 1000; default unrestricted. Natural-language tone/topic judgments are probabilistic, not a guarantee; metadata filters remain strict even if providers fail.

Feedback is limited to 50 recent local choices per account/guest. Signed-in feedback is additionally persisted under the verified Clerk user ID; saved ratings and the most recent 100 feedback records inform subsequent rankings. Positive/negative feedback boosts or lowers similar films and excludes the acted-on title from the next set. Users can undo either feedback button.

## Storage and safe deployment

Apply `prisma/migrations/20260906_recommendation_catalog/migration.sql` to the intended database **before deploying the route changes**, then run `npx prisma generate`. This project uses additive SQL migrations; do not reset or replace an existing database. Example with the intended `DATABASE_URL` configured:

```sh
npx prisma db execute --file prisma/migrations/20260906_recommendation_catalog/migration.sql
npx prisma generate
```

The migration creates `RecommendationMovie` and `RecommendationFeedback`, copies legacy movie rows/vectors with `ON CONFLICT DO NOTHING`, and preserves `MovieEmbedding`, daily pools and frame catalogs. It is safe to reapply. The existing pgvector extension is required. The application database used for verification has already received this migration.

Metadata refresh covers mainstream, niche, documentary, Polish, recent, genre and decade buckets independently from the guessing games. Adjust discovery buckets in `scripts/lib/recommend-catalog.mjs` to expand the selection. Existing rows are refreshed oldest-first, avoiding starvation once the catalog exceeds the batch limit. Missing/invalid/adult/future films are not newly imported.

```sh
npm run recommendations:sync -- --limit=5000
npm run recommendations:sync -- --refresh-only --limit=5000
npm run recommendations:embed -- --limit=300
npm run recommendations:check
```

Sync requires TMDB and database credentials. Embeddings additionally require `GEMINI_API_KEY`. Scripts load `.env.local`, then `.env`, without overriding supplied environment variables. `--force` bypasses the six-day metadata freshness check. Limits bound actual work, not the database size. No new dependencies are required.

Embedding batches checkpoint every successfully written movie. The text hash skips unchanged metadata. Unembedded movies are prioritized before stale vectors. HTTP 429 stops the job immediately; resume **after the provider quota is restored**, never in a tight retry loop. The embedding budget defaults to 300 movies to leave room for live requests, but the actual account quota must still be monitored. Do not change the model or vector dimensionality without fully rebuilding the index. Current vectors use Gemini embedding-001, 1536 dimensions and cosine distance.

`recommendations:check` verifies public model endpoints plus catalog/vector/provider coverage. It exits nonzero for missing vectors or stale provider data; this does not mean the fallback recommendation path is unavailable. Data attribution: TMDB / JustWatch; availability is a cached snapshot, not a real-time subscription guarantee.

## Scheduled maintenance

`.github/workflows/recommendation-catalog.yml` is intentionally gated by repository variable `RECOMMENDATION_REFRESH_ENABLED=true`. Until enabled, scheduled/manual jobs are skipped.

After authorization, configure GitHub Actions secrets `DATABASE_URL`, `TMDB_API_KEY`, `GEMINI_API_KEY`, and enable that variable. **Never commit secret values.** Weekly Monday metadata refresh and daily embedding work (maximum 300 movies) run at 03:17 UTC. Manual dispatch also refreshes metadata. Runs are serialized and time-bounded. No OpenRouter key is needed for catalog maintenance.

At delivery, secret upload and enabling this schedule remain unapproved; the workflow is prepared but not activated.

## Verification and current rollout status (2026-09-06)

- 3187 catalog movies imported, including 364 documentaries; 1841 have Polish subscription listings.
- 1968 movies currently have vectors: 988 copied legacy vectors plus 980 newly generated ones. 1219 still have no vector; 988 legacy vectors can later be refreshed to the new keyword-enriched text.
- Initial embedding expansion stopped on provider HTTP 429. Checkpoints are retained. The catalog remains usable through lexical retrieval and AI relevance review; the UI exposes degraded semantic matching.
- Unit/API/render suite: 356 passed; 12 opt-in integration cases skipped by default.
- The six isolated PostgreSQL transaction tests were run separately and passed.
- The six live-catalog scenarios were run separately and passed with no user-data or quota-counter mutation: Polish warm comedy without horror, nature documentary, space-exploration SF, Netflix romantic comedy, drama without war, crime thriller without horror.
- A live quality probe exposed a wartime drama incorrectly promoted by genre-only matching. The subsequent relevance review removed it from the warm-comedy/no-war cases. Nature requests returned Earth titles; space requests returned Interstellar, Ad Astra and 2001. These are observed examples, not a measured global accuracy claim.
- Browser checks covered PL/EN, reference search/select/remove, advanced filters, anonymous quota/login handling, responsive widths 390 and 1440, and feedback selection in a temporary read-only component preview. The preview files were removed before commit.
- Existing middleware/edge build warnings are unrelated to this change.

Run normal regression tests with `npm test`, `npm run lint` and `npm run build`.

The live suite is explicit and incurs bounded provider usage. PowerShell:

```powershell
$env:RECOMMENDATION_LIVE_CHECK='1'
npx vitest run src/lib/__tests__/recommend-catalog.integration.test.ts --reporter=verbose --disableConsoleIntercept
Remove-Item Env:RECOMMENDATION_LIVE_CHECK
```

The default suite does not call live providers or databases. Do not run live checks repeatedly while a quota is exhausted. Keep the fixed bilingual fixtures and filter invariants green when adjusting scoring. Human evaluation of tone/topic fit on a larger labeled set is still necessary before claiming higher recommendation accuracy.

## Recovery

Revert the application commit to restore the old route; the unchanged legacy table still exists. Do not drop the new tables as part of application rollback: preserve imported metadata and feedback for recovery. Disable the workflow variable to pause maintenance. Provider failures never trigger deletion, quota refunds, user-data changes or silently recycled recommendations.
