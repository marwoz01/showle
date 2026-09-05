import { MAX_ATTEMPTS } from "@/constants";

export interface DailyResultSample {
  status: string;
  attemptCount: number;
}

export interface DailyDistributionBucket {
  key: string;
  attempt: number | null;
  count: number;
  percentage: number;
}

export interface DailyPerformanceSummary {
  betterThan: number;
  playerCount: number;
  distribution: DailyDistributionBucket[];
}

function performanceScore(result: DailyResultSample): number {
  if (result.status !== "won") return 0;
  const attempts = Math.min(Math.max(result.attemptCount, 1), MAX_ATTEMPTS);
  return MAX_ATTEMPTS - attempts + 1;
}

export function buildDailyPerformanceSummary(
  results: DailyResultSample[],
  currentResult: DailyResultSample,
): DailyPerformanceSummary {
  const completed = results.filter(
    (result) => result.status === "won" || result.status === "lost",
  );
  const sample = completed.length > 0 ? completed : [currentResult];
  const currentScore = performanceScore(currentResult);
  const lowerScores = sample.filter(
    (result) => performanceScore(result) < currentScore,
  ).length;
  const equalScores = sample.filter(
    (result) => performanceScore(result) === currentScore,
  ).length;

  // Split tied places evenly instead of claiming every tied player was beaten.
  const betterThan = Math.round(
    ((lowerScores + equalScores * 0.5) / sample.length) * 100,
  );

  const buckets: DailyDistributionBucket[] = Array.from(
    { length: MAX_ATTEMPTS },
    (_, index) => {
      const attempt = index + 1;
      const count = sample.filter(
        (result) => result.status === "won" && result.attemptCount === attempt,
      ).length;
      return {
        key: String(attempt),
        attempt,
        count,
        percentage: (count / sample.length) * 100,
      };
    },
  );

  const lostCount = sample.filter((result) => result.status === "lost").length;
  buckets.push({
    key: "lost",
    attempt: null,
    count: lostCount,
    percentage: (lostCount / sample.length) * 100,
  });

  return {
    betterThan,
    playerCount: sample.length,
    distribution: buckets,
  };
}
