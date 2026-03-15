export const MAX_ATTEMPTS = 7;

export const GAME_MODES = [
  {
    id: "daily-movie" as const,
    label: "Daily Movie",
    description: "Odgadnij film dnia",
    icon: "🎬",
    href: "/play/movie",
    accentColor: "accent-purple",
  },
  {
    id: "daily-series" as const,
    label: "Daily Series",
    description: "Odgadnij serial dnia",
    icon: "📺",
    href: "/play/series",
    accentColor: "accent-purple",
  },
  {
    id: "unlimited" as const,
    label: "Unlimited Mode",
    description: "Graj bez limitu",
    icon: "∞",
    href: "/play/unlimited",
    accentColor: "accent-purple",
  },
] as const;

export const COMPARISON_LABELS = {
  year: "Rok",
  genres: "Gatunek",
  country: "Kraj",
  director: "Reżyser",
  runtime: "Czas",
  popularity: "Popularność",
  rating: "Ocena",
} as const;
