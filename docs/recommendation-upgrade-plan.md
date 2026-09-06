# Recommendation upgrade

Scope: implement the six improvements agreed in the recommendation review, verify them and push the completed changes. Preserve the daily/frame game pools and existing quota safeguards.

- [x] Replace the unavailable chat model; bound deadlines, retries and output; expose degraded matching.
- [x] Interpret positive/negative genres at word boundaries, preserve explicit filters, remove automatic tonal exclusions.
- [x] Create a separate multilingual recommendation catalog and import a broader TMDB selection including documentaries and niche titles.
- [x] Share one filter contract between semantic and fallback retrieval; never recycle previously shown movies silently.
- [x] Rank using collection ratings and explicit feedback; add reference-film selection, runtime and Polish subscription-provider filters.
- [x] Retrieve 60 candidates, review description/reference fit on a 24-film shortlist, diversify the final list and generate explanations from verified facts.
- [x] Add fixed quality scenarios, regression/API/render tests and a provider health check; run build/lint/tests and browser checks.
- [x] Apply additive schema changes and metadata import safely; preserve legacy/game data.
- [ ] Finish vector expansion after the provider quota is restored. Current coverage: 1968/3187; 980 new vectors checkpointed before HTTP 429.
- [ ] Activate scheduled refresh after authorization to configure GitHub Secrets. Workflow is ready but explicitly gated off.
- [ ] Commit and push the verified implementation.

Guardrails: no changes to game pools, no new dependencies, no personal viewing history sent to AI, no fabricated match percentages, no silent relaxation of hard constraints, no automatic quota refunds after provider work. Catalog jobs are bounded and resumable. Existing MovieEmbedding data remains intact.

See recommendations.md for maintenance, rollback, verification results and outstanding rollout steps.
