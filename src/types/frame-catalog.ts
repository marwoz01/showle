export interface FrameMovie {
  id: number;
  titles: { pl: string; en: string };
  year: number;
  genreIds: number[];
  keywordIds: number[];
  castIds: number[];
  directorIds: number[];
  language: string;
  collectionId: number | null;
  frames: string[];
}

/** Editorial overrides survive re-imports of TMDB metadata. */
export interface FrameMovieOverride {
  enabled?: boolean;
  titles?: Partial<FrameMovie["titles"]>;
  frames?: string[];
  relatedMovieIds?: number[];
}

export interface DuelMovieCandidate extends Omit<FrameMovie, "titles"> {
  title: string;
  relatedMovieIds?: number[];
}
