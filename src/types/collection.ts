export type CollectionCategory = "watched" | "watchlist";

export interface CollectionSaveResult {
  count: number;
  category: CollectionCategory;
  undoToken: string;
}
