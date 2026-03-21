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
    recommend: "Rekomendacje",
  },

  // Pro section
  pro: {
    title: "Odblokuj Pro",
    description:
      "Usuń reklamy, graj bez limitu i sprawdzaj szczegółowe statystyki.",
    upgrade: "Ulepsz do Pro",
    comingSoon: "Wkrótce dostępne",
  },

  // Home page
  home: {
    title: "Graj",
    subtitle:
      "Zgaduj film dnia albo odkryj idealny tytuł na wieczór, wszystko w jednym miejscu!",
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
    subtitle:
      "Zgaduj film dnia lub odkryj coś nowego w kilku prostych krokach.",
    step1Title: "Zgaduj film dnia",
    step1Desc:
      "Codziennie nowy film do odgadnięcia. Wpisz tytuł, a porównamy go z odpowiedzią w 7 parametrach.",
    step2Title: "Czytaj wskazówki",
    step2Desc:
      "Każda błędna próba odkrywa nową wskazówkę — inicjały reżysera, gatunek, kraj i więcej.",
    step3Title: "Odkrywaj filmy",
    step3Desc:
      "Wybierz gatunki i preferencje, a dobierzemy 5 filmów idealnie dopasowanych na wieczór.",
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
    leadActor: "Aktor",
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

  // Recommendations
  recommend: {
    title: "Co dziś obejrzeć?",
    subtitle: "Powiedz, na co masz ochotę, resztą zajmiemy się my.",
    modeTitle: "Co obejrzeć?",
    modeDesc:
      "Nie wiesz, co obejrzeć? Dobierzemy film idealnie pasujący do Twojego nastroju.",
    genresLabel: "Na co masz dziś ochotę?",
    selectGenre: "Wybierz przynajmniej 1 gatunek",
    yearLabel: "Rok premiery",
    popularityLabel: "Jak popularne?",
    popularityPopular: "Hity",
    popularityMedium: "Średnio znane",
    popularityNiche: "Ukryte perełki",
    submit: "Dobierz film",
    loading:
      "Nie zjadaj jeszcze całego popcornu... zaraz pojawią się dobrane filmy!",
    noResults:
      "Hmm, nic nie pasuje. Spróbuj zmienić preferencje — może trafi się coś fajnego!",
    error: "Coś poszło nie tak. Spróbuj ponownie za chwilę.",
    tryAgain: "Pokaż inne filmy",
    changePreferences: "Zmień preferencje",
    justification: "Dlaczego ten film?",
    director: "Reżyser",
    rating: "Ocena",
    getRecommendations: "Dobierz film",
    topPick: "Top Pick",
    whyRecommend: "Dlaczego polecamy",
    ctaSubtext:
      "Dobierzemy 5 filmów idealnie dopasowanych do Twoich preferencji",
    popularityPopularDesc: "Znane szerokiej publiczności",
    popularityMediumDesc: "Cenione przez koneserów",
    popularityNicheDesc: "Mało znane perełki do odkrycia",
    yearPresets: "Szybki wybór",
    yearAny: "Dowolny",
  },

  // Language
  lang: {
    label: "Język",
    pl: "Polski",
    en: "English",
  },
};

export default pl;
