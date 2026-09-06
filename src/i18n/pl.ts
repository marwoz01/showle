import { Translations } from "./types";

function polishMovieCount(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (count === 1) return "1 film";
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return `${count} filmy`;
  }
  return `${count} filmów`;
}

function polishGameCount(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (count === 1) return "1 gra";
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return `${count} gry`;
  }
  return `${count} gier`;
}

const pl: Translations = {
  meta: {
    title: "Showle — Film dnia",
    description:
      "Odgadnij film dnia, porównując rok, gatunek, reżysera, budżet i inne cechy. Codziennie nowe wyzwanie!",
  },
  common: {
    genericError: "Coś poszło nie tak. Spróbuj ponownie.",
    tryAgain: "Spróbuj ponownie",
    unknown: "Nieznane",
  },
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
    collection: "Kolekcja",
    sectionMain: "Główne",
    sectionDiscover: "Odkrywaj",
    sectionMore: "Więcej",
    history: "Historia",
  },

  // Pro section
  pro: {
    title: "Showle Pro",
    description:
      "Dodatkowe funkcje są w przygotowaniu. Obecne tryby gry pozostają dostępne bez Pro.",
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

  duel: {
    modeTitle: "Filmowy pojedynek",
    modeDesc:
      "Dołącz do drugiego gracza i rozpoznawaj filmy po kadrach. Oboje odpowiadacie, a poprawność i szybkość decydują o liczbie punktów.",
    modeAction: "Rozpocznij pojedynek",
    badge: "2 graczy",
    fourAnswers: "4 odpowiedzi",
    sixRounds: "6 rund",
    selectTitle: "Wybierz tryb gry",
    selectSubtitle: "Zagraj sam w film dnia albo zmierz się ze znajomym na żywo.",
    title: "Filmowy pojedynek",
    subtitle:
      "Macie 10 sekund na rozpoznanie filmu po kadrze. Poprawna i szybsza odpowiedź daje więcej punktów, a po sześciu rundach wygrywa najlepszy gracz.",
    back: "Wróć do trybów",
    nameLabel: "Twoja nazwa",
    namePlaceholder: "Wpisz nazwę gracza",
    createRoom: "Utwórz pokój",
    or: "lub dołącz do istniejącego",
    roomCode: "Kod pokoju",
    roomCodePlaceholder: "NP. K7W2QP",
    joinRoom: "Dołącz do pokoju",
    connecting: "Łączenie...",
    waitingTitle: "Czekamy na drugiego gracza",
    waitingDesc: "Przekaż znajomemu poniższy kod. Gra ruszy automatycznie, gdy dołączy.",
    inviteCode: "Kod zaproszenia",
    copyCode: "Kopiuj kod",
    copied: "Skopiowano",
    round: (current, total) => `Runda ${current} z ${total}`,
    points: (count) => `${count} pkt`,
    chooseAnswer: "Który to film?",
    answerLocked: "Odpowiedź zapisana — czekamy na wynik",
    correctAnswer: (points) => `Dobra odpowiedź! +${points} pkt`,
    wrongAnswer: "Niestety, to nie ten film",
    timeUp: "Czas minął",
    finished: "Koniec pojedynku",
    youWon: "Wygrywasz!",
    youLost: "Tym razem wygrywa przeciwnik",
    draw: "Remis!",
    playAgain: "Nowy pojedynek",
    backToModes: "Wybierz inny tryb",
    invalidPlayer: "Wpisz nazwę gracza.",
    invalidCode: "Kod pokoju powinien mieć 6 znaków.",
    roomNotFound: "Nie znaleziono takiego pokoju.",
    roomFull: "Ten pokój jest już pełny albo gra się rozpoczęła.",
    rateLimited: "Za dużo prób. Odczekaj chwilę i spróbuj ponownie.",
    serverError: "Nie udało się połączyć z pokojem. Spróbuj ponownie.",
  },

  // How it works
  howItWorks: {
    eyebrow: "Jak gramy",
    title: "Od pierwszego strzału do zwycięstwa",
    subtitle:
      "Cztery proste kroki, jedna filmowa zagadka i codziennie nowa szansa na lepszą serię.",
    step1Title: "Zgaduj film dnia",
    step1Desc:
      "Codziennie czeka nowy film. Wpisz tytuł, a porównamy go z odpowiedzią w 9 kategoriach.",
    step2Title: "Czytaj wskazówki",
    step2Desc:
      "Porównuj kolory i strzałki. Dodatkowe wskazówki odsłaniają się po 2., 4. i 6. próbie.",
    step3Title: "Odkrywaj filmy",
    step3Desc:
      "Wybierz gatunki i preferencje, a zaproponujemy do 8 filmów na Twój wieczór.",
    step4Title: "Udostępnij wynik",
    step4Desc:
      "Udało się? Podziel się siatką wyników ze znajomymi i porównajcie swoje serie zwycięstw.",
    ready: "Gotowy na seans?",
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
    movieCard: "Karta filmu",
    revealed: "Odkryto",
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
    popularity: "Liczba głosów",
    rating: "Ocena",
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
    tagline: (tagline: string) => `Hasło: "${tagline}"`,
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
    storyline: "Fabuła",
    gallery: "Galeria",
    cast: "Obsada",
    trailer: "Zwiastun",
    watchOnYouTube: "Obejrzyj w YouTube",
    whereToWatch: "Gdzie obejrzeć",
    rent: "Wypożycz",
    seeAllProviders: "Pełna lista",
    shareText: (title: string, attempts: number, max: number) =>
      `Showle — Film dnia\n\nOdgadłem "${title}" w ${attempts}/${max} próbach!\n\nhttps://showle.app`,
  },

  movieModal: {
    close: "Zamknij",
    next: "Następne",
    previous: "Poprzednie",
  },

  stats: {
    gamesPlayed: "Rozegrane gry",
    currentStreak: "Aktualna seria",
    bestStreak: "Najlepsza seria",
    averageGuesses: (average) => `Średnia liczba prób na grę: ${average}`,
    activityTitle: "Aktywność",
    activitySummary: (won, played) =>
      `Wygrane: ${won} z ${played} w ostatnim roku`,
    legendNone: "Brak gry",
    legendLost: "Pudło",
    legendWonFast: "1-2 próby",
    legendWonMid: "3-4 próby",
    legendWonSlow: "5-7 prób",
    tooltipWon: (attempts) =>
      `odgadnięte w ${attempts} ${attempts === 1 ? "próbie" : "próbach"}`,
    tooltipLost: "nieodgadnięte",
  },

  // Auth
  auth: {
    tagline: "Codzienna gra w zgadywanie filmów i seriali",
    signIn: "Zaloguj się",
    signUp: "Zarejestruj się",
    signOut: "Wyloguj się",
    email: "Adres e-mail",
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
    selectGenre: "Wybierz gatunek lub opisz, czego szukasz",
    freeformLabel: "Opisz swój nastrój",
    freeformPlaceholder: "np. coś jak Incepcja ale lżejszego...",
    freeformHint: "Opcjonalnie — opisz własnymi słowami, czego szukasz",
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
    topPick: "Najlepszy wybór",
    whyRecommend: "Dlaczego polecamy",
    ctaSubtext:
      "Zaproponujemy do 8 filmów dopasowanych do Twoich preferencji",
    popularityPopularDesc: "Znane szerokiej publiczności",
    popularityMediumDesc: "Cenione przez koneserów",
    popularityNicheDesc: "Mało znane perełki do odkrycia",
    yearPresets: "Szybki wybór",
    yearAny: "Dowolny",
    yearPreset90s: "Lata 90.",
    yearPreset2000s: "Lata 2000.",
    yearPreset2010s: "Lata 2010.",
    yearPresetRecent: "Od 2020",
    dailyLimitReached: "Wykorzystałeś dzienny limit rekomendacji. Wróć jutro po więcej!",
    dailyLimitAnon: "Zaloguj się, aby uzyskać więcej rekomendacji każdego dnia.",
    loginForMore: "Zaloguj się po więcej",
    quotaInfo: (remaining: number, limit: number) => `Pozostało ${remaining} z ${limit} rekomendacji na dziś`,
  },

  // Collection
  collection: {
    title: "Moja kolekcja",
    tabs: {
      watched: "Obejrzane",
      watchlist: "Do obejrzenia",
      rankings: "Rankingi",
    },
    addMovie: "Dodaj film",
    popularMovies: "Popularne filmy",
    addSelected: (count: number) => `Dodaj zaznaczone (${count})`,
    searchPlaceholder: "Szukaj filmu...",
    markWatched: "Oznacz jako obejrzany",
    moveToWatchlist: "Przenieś do obejrzenia",
    removeMovie: "Usuń z kolekcji",
    removeConfirm: "Czy na pewno chcesz usunąć ten film z kolekcji?",
    rating: "Ocena",
    review: "Recenzja",
    reviewPlaceholder: "Napisz swoją opinię o filmie...",
    writeReview: "Napisz recenzję",
    editReview: "Edytuj recenzję",
    saveReview: "Zapisz",
    noReview: "Brak recenzji",
    sortBy: "Sortuj",
    sortDate: "Data dodania",
    sortRating: "Ocena",
    sortTitle: "Tytuł",
    sortYear: "Rok",
    emptyWatched:
      "Nie masz jeszcze obejrzanych filmów. Dodaj swój pierwszy film!",
    loadMore: "Załaduj więcej",
    emptyWatchlist:
      "Twoja lista do obejrzenia jest pusta. Zapisz filmy na później!",
    emptyRankings: "Nie masz jeszcze żadnych rankingów. Stwórz swój pierwszy!",
    createList: "Nowy ranking",
    listName: "Nazwa rankingu",
    listNamePlaceholder: "np. 10 najlepszych filmów science fiction",
    listDescription: "Opis (opcjonalnie)",
    deleteList: "Usuń ranking",
    deleteListConfirm: "Czy na pewno chcesz usunąć ten ranking?",
    addToList: "Dodaj do rankingu",
    addFromCollection: "Dodaj z kolekcji",
    addAllWatched: "Wszystkie obejrzane",
    addAllWatchlist: "Wszystkie z listy do obejrzenia",
    addedCount: (added: number, skipped: number) =>
      `Dodano ${added}${skipped > 0 ? `, pominięto ${skipped} (już w rankingu)` : ""}`,
    position: "Pozycja",
    saved: "Zapisano",
    alreadySaved: "Już w kolekcji",
    addToCollection: "Dodaj do kolekcji",
    chooseCategory: "Wybierz kategorię",
    watched: "Obejrzane",
    watchlist: "Do obejrzenia",
    movieCount: polishMovieCount,
    confirmAction: "Potwierdź",
    cancel: "Anuluj",
  },

  // History
  history: {
    title: "Historia gier",
    totalGames: polishGameCount,
    filterAll: "Wszystkie",
    filterWon: "Wygrane",
    filterLost: "Przegrane",
    columnMovie: "Film",
    columnResult: "Wynik",
    columnAttempts: "Próby",
    columnHints: "Wskazówki",
    columnDate: "Data",
    resultWon: "Wygrana",
    resultLost: "Przegrana",
    review: "Przegląd",
    reviewTitle: "Przegląd gry",
    noGames: "Nie masz jeszcze żadnych ukończonych gier.",
    loading: "Ładowanie...",
    previousPage: "Poprzednia",
    nextPage: "Następna",
    pageOf: "z",
    attempts: "Próby",
    hintsUsed: "Wskazówki",
  },

  // Language
  lang: {
    label: "Język",
    pl: "Polski",
    en: "Angielski",
  },
  genres: {
    Action: "Akcja",
    Adventure: "Przygodowy",
    Animation: "Animacja",
    Comedy: "Komedia",
    Crime: "Kryminał",
    Documentary: "Dokumentalny",
    Drama: "Dramat",
    Fantasy: "Fantasy",
    Horror: "Horror",
    Mystery: "Tajemnica",
    Romance: "Romans",
    "Science Fiction": "Fantastyka naukowa",
    Thriller: "Thriller",
    War: "Wojenny",
    Western: "Western",
  },
};

export default pl;
