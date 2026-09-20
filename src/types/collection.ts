export type CollectionCategory = "watched" | "watchlist";
export type CollectionTab = CollectionCategory | "rankings";
export type CollectionSort = "date" | "rating" | "title" | "year";
export interface CollectionCounts { watched: number; watchlist: number; rankings: number }
export interface SavedMovie {
  id: string;
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string;
  category: CollectionCategory;
  rating: number | null;
  review: string | null;
  genres: string[];
  director: string;
  overview: string;
}
export interface CollectionPage { items: SavedMovie[]; total: number }
