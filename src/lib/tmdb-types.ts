export interface TmdbMovieListItem {
  id: number;
  title: string;
  original_title?: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  tagline: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  runtime: number;
  budget: number;
  genres: { id: number; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
}

export interface TmdbCredits {
  cast: {
    name: string;
    order: number;
    character: string;
    profile_path: string | null;
  }[];
  crew: {
    job: string;
    name: string;
    profile_path: string | null;
  }[];
}
