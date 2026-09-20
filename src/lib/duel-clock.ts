/** A slower response must not move the countdown backwards. */
export function synchronizeDuelClock(
  serverNow: number,
  receivedAt: number,
  previousOffset: number | null,
) {
  const observedOffset = serverNow - receivedAt;
  // Server timestamps are generated immediately before sending the response.
  // The largest offset is the sample with the smallest return-path delay.
  const offset = previousOffset === null
    ? observedOffset
    : Math.max(previousOffset, observedOffset);
  return { offset, now: receivedAt + offset };
}
