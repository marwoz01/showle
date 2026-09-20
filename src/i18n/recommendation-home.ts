export interface RecommendationHomeCopy {
  title: string; subtitle: string;
  setupTitle: string; setupDescription: string; favoritesLabel: string; favoritesHint: string;
  favoriteSearch: string; removeFavorite: (title: string) => string; savedMovie: (id: number) => string;
  platformsLabel: string; platformsHint: string; allPlatforms: string; save: string; saving: string;
  skip: string; cancel: string; edit: string; saved: string; accountHint: string; guestHint: string;
  sessionOnly: string; preferenceError: string; picksTitle: string; popularTitle: string;
  popularHint: string; refineLabel: string; refinePlaceholder: string; light: string; lightPrompt: string;
  short: string; apply: string; next: string; advanced: string; watchlist: string; minutes: (count: number) => string;
  referenceToggle: string; feedbackHint: string; loading: string; noResults: string; partial: (count: number) => string;
  favoriteLimit: string; details: string;
}

export const recommendationHomePl: RecommendationHomeCopy = {
  title: "Co dziś obejrzysz?",
  subtitle: "Trzy propozycje. Twój gust, Twoje platformy.",
  setupTitle: "Zacznijmy od Twojego gustu",
  setupDescription: "Ustaw raz. Następnym razem od razu zobaczysz propozycje.",
  favoritesLabel: "Jakie filmy lubisz?",
  favoritesHint: "Dodaj 3-5 ulubionych filmów. Możesz też zacząć bez nich.",
  favoriteSearch: "Wyszukaj film, który lubisz…",
  removeFavorite: (title) => `Usuń ${title} z ulubionych`,
  savedMovie: (id) => `Zapisany film #${id}`,
  platformsLabel: "Gdzie oglądasz?",
  platformsHint: "Dostępność w Polsce. Bez wyboru platform pokażemy filmy z całego katalogu.",
  allPlatforms: "Wszystkie platformy",
  save: "Zapisz i pokaż filmy", saving: "Zapisujemy…", skip: "Pokaż popularne filmy", cancel: "Anuluj",
  edit: "Mój gust i platformy", saved: "Preferencje zapisane.",
  accountHint: "Preferencje zapisujemy na Twoim koncie.",
  guestHint: "Preferencje zapamiętamy w tej przeglądarce. Konto pozwoli zachować je na innych urządzeniach.",
  sessionOnly: "Przeglądarka nie pozwala zapisać preferencji. Będą dostępne do końca tej sesji.",
  preferenceError: "Nie udało się wczytać preferencji. Spróbuj ponownie.",
  picksTitle: "Dla Ciebie", popularTitle: "Dobry punkt wyjścia",
  popularHint: "Na początek popularne, dobrze oceniane filmy. Dodaj ulubione lub oceń propozycje, żeby lepiej dopasować kolejne.",
  refineLabel: "Na co masz dziś ochotę?", refinePlaceholder: "Np. lekki film albo kryminał bez przemocy…",
  light: "Coś lekkiego", lightPrompt: "Lekki, pogodny film", short: "Do 90 minut", apply: "Dopasuj propozycje",
  next: "Pokaż inne", advanced: "Więcej filtrów", watchlist: "Wybierz z mojej listy", minutes: (count) => `${count} min`,
  referenceToggle: "Podobne do konkretnego filmu", feedbackHint: "Twoje oceny i reakcje pomagają dobrać następne propozycje.",
  loading: "Wybieramy filmy…", noResults: "Nie znaleźliśmy filmu pasującego do tych ustawień. Zmień platformy lub poluzuj wymagania.",
  partial: (count) => count === 1 ? "Znaleźliśmy jeden pasujący film. Nie dokładamy filmów niespełniających Twoich wymagań."
    : `Znaleźliśmy ${count} pasujące propozycje. Nie dokładamy filmów niespełniających Twoich wymagań.`,
  favoriteLimit: "Masz już 5 ulubionych. Usuń jeden, żeby dodać kolejny.", details: "Szczegóły filmu",
};

export const recommendationHomeEn: RecommendationHomeCopy = {
  title: "What will you watch tonight?",
  subtitle: "Three picks. Your taste, your streaming services.",
  setupTitle: "Let’s start with your taste",
  setupDescription: "Set it up once. Your picks will be ready next time.",
  favoritesLabel: "Which movies do you love?",
  favoritesHint: "Add 3-5 favorites, or start without them.",
  favoriteSearch: "Search for a movie you love…",
  removeFavorite: (title) => `Remove ${title} from favorites`,
  savedMovie: (id) => `Saved movie #${id}`,
  platformsLabel: "Where do you watch?",
  platformsHint: "Availability in Poland. Leave all services unselected to explore the full catalog.",
  allPlatforms: "All streaming services",
  save: "Save and show movies", saving: "Saving…", skip: "Show popular movies", cancel: "Cancel",
  edit: "My taste and services", saved: "Preferences saved.",
  accountHint: "Your preferences are saved to your account.",
  guestHint: "We’ll remember your preferences in this browser. An account keeps them available on other devices.",
  sessionOnly: "Your browser could not save your preferences. They will be available for this session only.",
  preferenceError: "We couldn’t load your preferences. Please try again.",
  picksTitle: "For you", popularTitle: "A good place to start",
  popularHint: "Popular, well-rated movies to get you started. Add favorites or react to picks to help us learn your taste.",
  refineLabel: "What are you in the mood for?", refinePlaceholder: "E.g. something light, or a mystery without violence…",
  light: "Something light", lightPrompt: "A light, uplifting movie", short: "Under 90 minutes", apply: "Update my picks",
  next: "Show other movies", advanced: "More filters", watchlist: "Choose from my watchlist", minutes: (count) => `${count} min`,
  referenceToggle: "Similar to a specific movie", feedbackHint: "Your ratings and reactions help us choose your next picks.",
  loading: "Finding your movies…", noResults: "We couldn’t find a movie that fits these settings. Change your services or relax a filter.",
  partial: (count) => `We found ${count} matching picks. We won’t add movies that miss your requirements.`,
  favoriteLimit: "You already have 5 favorites. Remove one to add another.", details: "Movie details",
};
