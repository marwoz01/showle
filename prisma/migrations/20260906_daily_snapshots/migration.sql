CREATE TABLE IF NOT EXISTS "DailyMovieSnapshot" (
  "dateKey" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "locale" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  CONSTRAINT "DailyMovieSnapshot_pkey" PRIMARY KEY ("dateKey", "tmdbId", "locale")
);
