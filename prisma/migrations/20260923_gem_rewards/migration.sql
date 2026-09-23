ALTER TABLE "CoinTransaction" ADD COLUMN "rewardKey" TEXT;

CREATE UNIQUE INDEX "CoinTransaction_userId_rewardKey_key" ON "CoinTransaction"("userId", "rewardKey");
CREATE INDEX "CoinTransaction_userId_createdAt_idx" ON "CoinTransaction"("userId", "createdAt");
