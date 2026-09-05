export interface TrailerCandidate {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1: string;
  published_at?: string;
}

export interface MovieTrailer {
  key: string;
  name: string;
}

const YOUTUBE_KEY_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

function scoreTrailer(video: TrailerCandidate, preferredLanguage: string) {
  const language = preferredLanguage.split("-")[0];
  const typeScore = video.type === "Trailer" ? 100 : 50;
  const languageScore = video.iso_639_1 === language ? 25 : 0;
  const officialScore = video.official ? 20 : 0;

  return typeScore + languageScore + officialScore;
}

export function selectBestTrailer(
  videos: TrailerCandidate[],
  preferredLanguage: string,
): MovieTrailer | null {
  const candidates = videos
    .filter(
      (video) =>
        video.site === "YouTube" &&
        (video.type === "Trailer" || video.type === "Teaser") &&
        YOUTUBE_KEY_PATTERN.test(video.key),
    )
    .sort((a, b) => {
      const scoreDifference =
        scoreTrailer(b, preferredLanguage) - scoreTrailer(a, preferredLanguage);

      if (scoreDifference !== 0) return scoreDifference;

      return (
        Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? "") || 0
      );
    });

  const selected = candidates[0];
  return selected ? { key: selected.key, name: selected.name } : null;
}
