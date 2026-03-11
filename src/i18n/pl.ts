import { Translations } from "./types";

const pl: Translations = {
  // Nav
  nav: {
    home: "Strona główna",
    play: "Graj",
    notifications: "Powiadomienia",
    stats: "Statystyki",
    settings: "Ustawienia",
    documentation: "Dokumentacja",
    referFriend: "Poleć znajomemu",
    search: "Szukaj...",
    other: "Inne",
    login: "Zaloguj się",
  },

  // Pro section
  pro: {
    title: "Odblokuj Pro",
    description: "Nieograniczona gra, szczegółowe statystyki i wczesny dostęp.",
    upgrade: "Ulepsz do Pro",
  },

  // Home page
  home: {
    title: "Graj",
    subtitle:
      "Sprawdź swoją wiedzę filmową. Rozpoznawaj filmy i seriale na podstawie porównań parametrów i wskazówek.",
    filter: "Filtruj",
    viewGrid: "Widok: Siatka",
  },

  // Game modes
  modes: {
    dailyMovie: "Film dnia",
    dailyMovieDesc:
      "Odgadnij dzisiejszy film na podstawie porównań parametrów. Resetuje się o północy.",
    dailySeries: "Serial dnia",
    dailySeriesDesc:
      "Odgadnij serial dnia na podstawie porównań parametrów i wskazówek.",
    unlimited: "Bez limitu",
    unlimitedDesc:
      "Nie masz dość? Graj bez końca przez cały katalog tysięcy tytułów we własnym tempie.",
    playChallenge: "Zagraj",
    startEndless: "Zacznij grę",
    popular: "Popularne",
    new: "Nowość",
    comingSoon: "Wkrótce",
  },

  // How it works
  howItWorks: {
    title: "Jak to działa",
    subtitle: "Trzy proste kroki, by udowodnić swoją wiedzę.",
    step1Title: "Wybierz tryb",
    step1Desc:
      "Wybierz Film dnia, Serial dnia lub graj bez końca w trybie Bez limitu.",
    step2Title: "Zgaduj tytuł",
    step2Desc:
      "Wpisz nazwę filmu lub serialu. Porównamy go z odpowiedzią w 7 parametrach.",
    step3Title: "Czytaj wskazówki",
    step3Desc:
      "Każda błędna próba odkrywa nową wskazówkę - inicjały reżysera, gatunek, kraj i więcej.",
    step4Title: "Udostępnij wynik",
    step4Desc:
      "Udało się? Podziel się swoją siatką wyników ze znajomymi i porównaj serie.",
  },

  // Game screen
  game: {
    back: "Powrót",
    dailyMovie: "Film dnia",
    dailySeries: "Serial dnia",
    attempt: "Próba",
    giveUp: "Poddaj się",
    searchPlaceholder: "Wpisz tytuł filmu...",
    emptyState: "Wpisz tytuł filmu, żeby zacząć zgadywanie",
    won: "Brawo!",
    wonMessage: (title: string, attempts: number) =>
      `Odgadłeś "${title}" w ${attempts} ${attempts === 1 ? "próbie" : "próbach"}!`,
    lost: "Koniec gry",
    lostMessage: (title: string, year: number) =>
      `Prawidłowa odpowiedź: ${title} (${year})`,
    correct: "Trafione!",
  },

  // Comparison labels
  comparison: {
    year: "Rok",
    genre: "Gatunek",
    country: "Kraj",
    director: "Reżyser",
    runtime: "Czas",
    popularity: "Popularność",
    rating: "Ocena",
  },

  // Popularity labels
  popularity: {
    low: "Niska",
    medium: "Średnia",
    high: "Wysoka",
    veryHigh: "Bardzo wysoka",
    mega: "Mega",
  },

  // Hints
  hints: {
    title: "Wskazówki",
    directorStartsWith: (letter: string) => `Reżyser zaczyna się na: ${letter}`,
    genreIs: (genre: string) => `Jeden z gatunków: ${genre}`,
    fromDecade: (decade: number) => `Film pochodzi z lat ${decade}.`,
    countryIs: (country: string) => `Kraj produkcji: ${country}`,
    tagline: (tagline: string) => `Tagline: "${tagline}"`,
    overview: (text: string) => `Opis: ${text}...`,
    directorInitials: (initials: string) => `Inicjały reżysera: ${initials}`,
    titleStartsWith: (letter: string) => `Tytuł zaczyna się na: "${letter}"`,
    titleLength: (length: number) => `Tytuł ma ${length} znaków`,
  },

  // Language
  lang: {
    label: "Język",
    pl: "Polski",
    en: "English",
  },
};

export default pl;
