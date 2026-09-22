import type { ProfileMovie } from "@/types/profile";

export type ActivityVisibility = "private" | "friends" | "public";
export type SocialAction = "follow" | "unfollow" | "request" | "accept" | "decline" | "cancel" | "remove";
export interface SocialProfileCard {
  publicSlug: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  isPublic: boolean;
}
export interface SocialRelationship {
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  friendship: "none" | "incoming" | "outgoing" | "friends";
}
export interface SocialPerson extends SocialProfileCard { relationship: SocialRelationship }
export interface SocialSummary {
  friends: SocialPerson[];
  following: SocialPerson[];
  followers: SocialPerson[];
  incoming: SocialPerson[];
  outgoing: SocialPerson[];
}
export interface SocialActivity {
  id: string;
  person: SocialProfileCard;
  movie: ProfileMovie;
  rating: number | null;
  date: string;
  kind: "watched" | "rating";
}
