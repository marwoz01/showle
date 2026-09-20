CREATE TABLE IF NOT EXISTS "AccountDeletionTask" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "retryAfter" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "AccountDeletionTask_retryAfter_idx" ON "AccountDeletionTask"("retryAfter");
