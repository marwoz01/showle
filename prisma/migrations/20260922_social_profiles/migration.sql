ALTER TABLE "UserProfile" ADD COLUMN "activityVisibility" TEXT NOT NULL DEFAULT 'friends';
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_activityVisibility_check" CHECK ("activityVisibility" IN ('private', 'friends', 'public'));

CREATE TABLE "UserFollow" (
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("followerId", "followingId"),
  CONSTRAINT "UserFollow_not_self" CHECK ("followerId" <> "followingId"),
  CONSTRAINT "UserFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "UserProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "UserProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserFollow_followingId_createdAt_idx" ON "UserFollow"("followingId", "createdAt");

CREATE TABLE "UserFriendship" (
  "lowId" TEXT NOT NULL,
  "highId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserFriendship_pkey" PRIMARY KEY ("lowId", "highId"),
  CONSTRAINT "UserFriendship_canonical_pair" CHECK ("lowId" COLLATE "C" < "highId" COLLATE "C"),
  CONSTRAINT "UserFriendship_requester_member" CHECK ("requesterId" IN ("lowId", "highId")),
  CONSTRAINT "UserFriendship_status_check" CHECK ("status" IN ('pending', 'accepted')),
  CONSTRAINT "UserFriendship_lowId_fkey" FOREIGN KEY ("lowId") REFERENCES "UserProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserFriendship_highId_fkey" FOREIGN KEY ("highId") REFERENCES "UserProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserFriendship_highId_status_idx" ON "UserFriendship"("highId", "status");
CREATE INDEX "UserFriendship_lowId_status_idx" ON "UserFriendship"("lowId", "status");
