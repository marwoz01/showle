-- Empty databases only. For an existing database follow docs/production.md before recording this baseline.
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS "public";
CREATE TABLE "GameResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'daily-movie',
    "status" TEXT NOT NULL,
    "guessIds" INTEGER[],
    "attemptCount" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetMovieId" INTEGER NOT NULL DEFAULT 0,
    "targetTitle" TEXT NOT NULL DEFAULT '',
    "targetYear" INTEGER NOT NULL DEFAULT 0,
    "targetPoster" TEXT NOT NULL DEFAULT '',
    "extraAttempts" INTEGER NOT NULL DEFAULT 0,
    "paidHintUsed" BOOLEAN NOT NULL DEFAULT false,
    "paidHintsCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "averageGuesses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPlayedDate" TEXT,
    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SavedMovie" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "posterPath" TEXT NOT NULL,
    "genres" TEXT[],
    "director" TEXT NOT NULL DEFAULT '',
    "overview" TEXT NOT NULL DEFAULT '',
    "runtime" INTEGER NOT NULL DEFAULT 0,
    "tmdbRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "review" TEXT,
    "watchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedMovie_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RankedList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RankedList_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RankedListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "posterPath" TEXT NOT NULL,
    "genres" TEXT[],
    "director" TEXT NOT NULL DEFAULT '',
    "overview" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    CONSTRAINT "RankedListItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "streakFreezes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "dateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DailyUsage" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("key")
);
CREATE TABLE "DuelRoom" (
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "hostId" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "guestId" TEXT,
    "guestName" TEXT,
    "questions" JSONB NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "hostScore" INTEGER NOT NULL DEFAULT 0,
    "guestScore" INTEGER NOT NULL DEFAULT 0,
    "hostRoundPoints" INTEGER NOT NULL DEFAULT 0,
    "guestRoundPoints" INTEGER NOT NULL DEFAULT 0,
    "hostAnsweredRound" INTEGER NOT NULL DEFAULT -1,
    "guestAnsweredRound" INTEGER NOT NULL DEFAULT -1,
    "roundWinnerId" TEXT,
    "roundStartedAt" TIMESTAMP(3),
    "roundEndsAt" TIMESTAMP(3),
    "roundResolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DuelRoom_pkey" PRIMARY KEY ("code")
);
CREATE TABLE "MovieEmbedding" (
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "genres" TEXT[],
    "overview" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posterPath" TEXT NOT NULL DEFAULT '',
    "backdropPath" TEXT NOT NULL DEFAULT '',
    "director" TEXT NOT NULL DEFAULT 'Unknown',
    "leadActor" TEXT NOT NULL DEFAULT 'Unknown',
    "country" TEXT NOT NULL DEFAULT 'Unknown',
    "runtime" INTEGER NOT NULL DEFAULT 0,
    "budget" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tagline" TEXT,
    "cast" JSONB NOT NULL DEFAULT '[]',
    "embedding" vector(1536) NOT NULL,
    CONSTRAINT "MovieEmbedding_pkey" PRIMARY KEY ("tmdbId")
);
CREATE INDEX "GameResult_userId_idx" ON "GameResult"("userId");
CREATE INDEX "GameResult_userId_completedAt_idx" ON "GameResult"("userId", "completedAt");
CREATE UNIQUE INDEX "GameResult_userId_dateKey_mode_key" ON "GameResult"("userId", "dateKey", "mode");
CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");
CREATE INDEX "SavedMovie_userId_category_idx" ON "SavedMovie"("userId", "category");
CREATE INDEX "SavedMovie_userId_createdAt_idx" ON "SavedMovie"("userId", "createdAt");
CREATE UNIQUE INDEX "SavedMovie_userId_tmdbId_key" ON "SavedMovie"("userId", "tmdbId");
CREATE INDEX "RankedList_userId_idx" ON "RankedList"("userId");
CREATE INDEX "RankedListItem_listId_position_idx" ON "RankedListItem"("listId", "position");
CREATE INDEX "RankedListItem_listId_idx" ON "RankedListItem"("listId");
CREATE UNIQUE INDEX "RankedListItem_listId_tmdbId_key" ON "RankedListItem"("listId", "tmdbId");
CREATE UNIQUE INDEX "UserWallet_userId_key" ON "UserWallet"("userId");
CREATE INDEX "CoinTransaction_userId_idx" ON "CoinTransaction"("userId");
CREATE INDEX "DailyUsage_date_idx" ON "DailyUsage"("date");
CREATE INDEX "DuelRoom_status_idx" ON "DuelRoom"("status");
CREATE INDEX "DuelRoom_expiresAt_idx" ON "DuelRoom"("expiresAt");
CREATE INDEX "MovieEmbedding_year_idx" ON "MovieEmbedding"("year");
ALTER TABLE "RankedListItem" ADD CONSTRAINT "RankedListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "RankedList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
