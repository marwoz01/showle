CREATE TABLE IF NOT EXISTS "RecommendationMovie" (
  "tmdbId" INTEGER PRIMARY KEY,
  "title" TEXT NOT NULL, "titlePl" TEXT NOT NULL DEFAULT '',
  "year" INTEGER NOT NULL, "genres" TEXT[] NOT NULL DEFAULT '{}',
  "overview" TEXT NOT NULL DEFAULT '', "overviewPl" TEXT NOT NULL DEFAULT '',
  "posterPath" TEXT NOT NULL DEFAULT '', "backdropPath" TEXT NOT NULL DEFAULT '',
  "director" TEXT NOT NULL DEFAULT '', "leadActor" TEXT NOT NULL DEFAULT '',
  "country" TEXT NOT NULL DEFAULT '', "countryCode" TEXT NOT NULL DEFAULT '',
  "runtime" INTEGER NOT NULL DEFAULT 0, "budget" INTEGER NOT NULL DEFAULT 0,
  "voteCount" INTEGER NOT NULL DEFAULT 0, "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tagline" TEXT, "taglinePl" TEXT, "cast" JSONB NOT NULL DEFAULT '[]',
  "keywords" TEXT[] NOT NULL DEFAULT '{}', "collectionId" INTEGER,
  "providerIds" INTEGER[] NOT NULL DEFAULT '{}', "providersUpdatedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "embedding" vector(1536), "embeddingTextHash" TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "RecommendationMovie_year_idx" ON "RecommendationMovie" ("year");
CREATE INDEX IF NOT EXISTS "RecommendationMovie_genres_idx" ON "RecommendationMovie" USING GIN ("genres");
CREATE INDEX IF NOT EXISTS "RecommendationMovie_providerIds_idx" ON "RecommendationMovie" USING GIN ("providerIds");

INSERT INTO "RecommendationMovie" (
  "tmdbId", title, year, genres, overview, "posterPath", "backdropPath", director,
  "leadActor", country, runtime, budget, "voteCount", rating, tagline, "cast", embedding, "updatedAt"
) SELECT "tmdbId", title, year, genres, overview, "posterPath", "backdropPath", director,
  "leadActor", country, runtime, budget, "voteCount", rating, tagline, "cast", embedding, TIMESTAMP '2000-01-01'
FROM "MovieEmbedding" ON CONFLICT ("tmdbId") DO NOTHING;

CREATE TABLE IF NOT EXISTS "RecommendationFeedback" (
  "userId" TEXT NOT NULL, "tmdbId" INTEGER NOT NULL, "reaction" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "tmdbId"),
  CONSTRAINT "RecommendationFeedback_reaction_check" CHECK ("reaction" IN ('more', 'less'))
);
CREATE INDEX IF NOT EXISTS "RecommendationFeedback_userId_updatedAt_idx" ON "RecommendationFeedback" ("userId", "updatedAt");
