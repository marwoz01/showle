export interface TasteSignal { genres: string[]; director: string; weight: number }

export function tasteScore(movie: { genres: string[]; director: string }, signals: TasteSignal[]): number {
  if (!signals.length) return 0;
  const sum = signals.reduce((total, signal) => {
    const overlap = movie.genres.filter((genre) => signal.genres.includes(genre)).length / Math.max(1, movie.genres.length, signal.genres.length);
    const director = movie.director && movie.director !== "Unknown" && movie.director === signal.director ? 1 : 0;
    return total + signal.weight * (0.65 * overlap + 0.35 * director);
  }, 0);
  return Math.max(-1, Math.min(1, sum / Math.sqrt(signals.length)));
}
