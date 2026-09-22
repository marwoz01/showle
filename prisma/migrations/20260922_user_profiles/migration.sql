CREATE TABLE "UserProfile" (
  "userId" TEXT NOT NULL,
  "publicSlug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT 'Kinoman',
  "bio" TEXT NOT NULL DEFAULT '',
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "avatarUrl" TEXT,
  "favoriteMovieIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "favoriteMovies" JSONB NOT NULL DEFAULT '[]',
  "providerIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "excludedGenres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "maxRuntime" INTEGER,
  "locale" TEXT NOT NULL DEFAULT 'pl',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);
CREATE UNIQUE INDEX "UserProfile_publicSlug_key" ON "UserProfile"("publicSlug");

CREATE TABLE "HigherLowerRecord" (
  "userId" TEXT NOT NULL,
  "bestScore" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HigherLowerRecord_pkey" PRIMARY KEY ("userId")
);
