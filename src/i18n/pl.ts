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
    description: "Usuń reklamy, graj bez limitu i sprawdzaj szczegółowe statystyki.",
    upgrade: "Ulepsz do Pro",
    comingSoon: "Wkrótce dostępne",
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
    nextIn: "Następny za",
    loadError: "Nie udało się załadować filmu. Spróbuj ponownie później.",
  },

  // Comparison labels
  comparison: {
    year: "Rok",
    genre: "Gatunek",
    country: "Kraj",
    director: "Reżyser",
    runtime: "Czas",
    budget: "Budżet",
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
    directorIs: (name: string) => `Reżyser: ${name}`,
    genreIs: (genre: string) => `Jeden z gatunków: ${genre}`,
    genresAre: (genres: string) => `Gatunki: ${genres}`,
    fromDecade: (decade: number) => `Film pochodzi z lat ${decade}.`,
    countryIs: (country: string) => `Kraj produkcji: ${country}`,
    tagline: (tagline: string) => `Tagline: "${tagline}"`,
    overview: (text: string) => `Opis: ${text}...`,
    directorInitials: (initials: string) => `Inicjały reżysera: ${initials}`,
    titleStartsWith: (letter: string) => `Tytuł zaczyna się na: "${letter}"`,
    titleLength: (length: number) => `Tytuł ma ${length} znaków`,
  },

  // Result screen
  result: {
    title: "Wynik",
    youGuessed: "Udało się!",
    theAnswerWas: "Prawidłowa odpowiedź",
    attempts: "Próby",
    hintsUsed: "Użyte wskazówki",
    accuracy: "Trafność",
    share: "Udostępnij wynik",
    copied: "Skopiowano!",
    playAgain: "Zagraj ponownie",
    shareText: (title: string, attempts: number, max: number) =>
      `Showle - Film dnia\n\nOdgadłem "${title}" w ${attempts}/${max} próbach!\n\nhttps://showle.app`,
  },

  // Auth
  auth: {
    signIn: "Zaloguj się",
    signUp: "Zarejestruj się",
    signOut: "Wyloguj się",
    email: "Email",
    password: "Hasło",
    confirmPassword: "Potwierdź hasło",
    name: "Nazwa użytkownika",
    namePlaceholder: "Jan Kowalski",
    noAccount: "Nie masz konta?",
    hasAccount: "Masz już konto?",
    passwordMin: "Hasło musi mieć minimum 8 znaków.",
    passwordMismatch: "Hasła nie są identyczne.",
    invalidCredentials: "Nieprawidłowy email lub hasło.",
    emailInUse: "Ten email jest już zajęty.",
  },

  // Language
  lang: {
    label: "Język",
    pl: "Polski",
    en: "English",
  },
};

export default pl;
