-- Additive: shared movie selection has its own state, independent of games.
CREATE TABLE "MovieChoiceRoom" (
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "locale" TEXT NOT NULL DEFAULT 'pl',
    "hostId" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "guestId" TEXT,
    "guestName" TEXT,
    "hostPreferences" JSONB NOT NULL DEFAULT 'null',
    "guestPreferences" JSONB NOT NULL DEFAULT 'null',
    "hostVotes" JSONB NOT NULL DEFAULT '[]',
    "guestVotes" JSONB NOT NULL DEFAULT '[]',
    "movies" JSONB NOT NULL DEFAULT '[]',
    "excludedMovieIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "matchMovieId" INTEGER,
    "batch" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "generationToken" TEXT,
    "generationStartedAt" TIMESTAMP(3),
    "generationError" TEXT,
    "generationAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MovieChoiceRoom_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "MovieChoiceRoom_expiresAt_idx" ON "MovieChoiceRoom"("expiresAt");
