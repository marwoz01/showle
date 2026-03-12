export interface Translations {
  nav: {
    home: string;
    play: string;
    notifications: string;
    stats: string;
    settings: string;
    documentation: string;
    referFriend: string;
    search: string;
    other: string;
    login: string;
  };
  pro: {
    title: string;
    description: string;
    upgrade: string;
  };
  home: {
    title: string;
    subtitle: string;
    filter: string;
    viewGrid: string;
  };
  modes: {
    dailyMovie: string;
    dailyMovieDesc: string;
    dailySeries: string;
    dailySeriesDesc: string;
    unlimited: string;
    unlimitedDesc: string;
    playChallenge: string;
    startEndless: string;
    popular: string;
    new: string;
    comingSoon: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
  };
  game: {
    back: string;
    dailyMovie: string;
    dailySeries: string;
    attempt: string;
    giveUp: string;
    searchPlaceholder: string;
    emptyState: string;
    won: string;
    wonMessage: (title: string, attempts: number) => string;
    lost: string;
    lostMessage: (title: string, year: number) => string;
    correct: string;
    nextIn: string;
    loadError: string;
  };
  comparison: {
    year: string;
    genre: string;
    country: string;
    director: string;
    runtime: string;
    budget: string;
    popularity: string;
    rating: string;
  };
  popularity: {
    low: string;
    medium: string;
    high: string;
    veryHigh: string;
    mega: string;
  };
  hints: {
    title: string;
    directorStartsWith: (letter: string) => string;
    genreIs: (genre: string) => string;
    fromDecade: (decade: number) => string;
    countryIs: (country: string) => string;
    tagline: (tagline: string) => string;
    overview: (text: string) => string;
    directorInitials: (initials: string) => string;
    titleStartsWith: (letter: string) => string;
    titleLength: (length: number) => string;
  };
  result: {
    title: string;
    youGuessed: string;
    theAnswerWas: string;
    attempts: string;
    hintsUsed: string;
    accuracy: string;
    share: string;
    copied: string;
    playAgain: string;
    shareText: (title: string, attempts: number, max: number) => string;
  };
  lang: {
    label: string;
    pl: string;
    en: string;
  };
}
