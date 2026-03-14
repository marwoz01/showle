import { Translations } from "./types";

const en: Translations = {
  // Nav
  nav: {
    home: "Home",
    play: "Play",
    notifications: "Notifications",
    stats: "Stats",
    settings: "Settings",
    documentation: "Documentation",
    referFriend: "Refer a Friend",
    search: "Search...",
    other: "Other",
    login: "Sign In",
  },

  // Pro section
  pro: {
    title: "Unlock Pro",
    description: "Remove ads, get unlimited plays, and detailed statistics.",
    upgrade: "Upgrade to Pro",
    comingSoon: "Coming Soon",
  },

  // Home page
  home: {
    title: "Play",
    subtitle:
      "Test your cinematic knowledge. Identify movies and series from parameter comparisons and hints.",
    filter: "Filter",
    viewGrid: "View: Grid",
  },

  // Game modes
  modes: {
    dailyMovie: "Daily Movie",
    dailyMovieDesc:
      "Guess today's featured film from parameter comparisons. Resets at midnight.",
    dailySeries: "Daily Series",
    dailySeriesDesc:
      "Identify the TV show of the day based on parameter comparisons and hints.",
    unlimited: "Unlimited",
    unlimitedDesc:
      "Can't get enough? Play endlessly through our entire catalog of thousands of titles at your own pace.",
    playChallenge: "Play Challenge",
    startEndless: "Start Endless Run",
    popular: "Popular",
    new: "New",
    comingSoon: "Coming Soon",
  },

  // How it works
  howItWorks: {
    title: "How It Works",
    subtitle: "Three simple steps to prove your expertise.",
    step1Title: "Choose a Mode",
    step1Desc:
      "Pick Daily Movie, Daily Series, or play endlessly in Unlimited mode.",
    step2Title: "Guess the Title",
    step2Desc:
      "Type a movie or series name. We'll compare it against the answer across 7 parameters.",
    step3Title: "Read the Clues",
    step3Desc:
      "Each wrong guess reveals a new hint — director initials, genre, country, and more.",
    step4Title: "Share Your Score",
    step4Desc:
      "Nailed it? Share your result grid with friends and compare streaks.",
  },

  // Game screen
  game: {
    back: "Back",
    dailyMovie: "Daily Movie",
    dailySeries: "Daily Series",
    attempt: "Attempt",
    giveUp: "Give Up",
    searchPlaceholder: "Type a movie title...",
    emptyState: "Type a movie title to start guessing",
    won: "Well done!",
    wonMessage: (title: string, attempts: number) =>
      `You guessed "${title}" in ${attempts} ${attempts === 1 ? "attempt" : "attempts"}!`,
    lost: "Game Over",
    lostMessage: (title: string, year: number) =>
      `The answer was: ${title} (${year})`,
    correct: "Correct!",
    nextIn: "Next in",
    loadError: "Failed to load the movie. Please try again later.",
  },

  // Comparison labels
  comparison: {
    year: "Year",
    genre: "Genre",
    country: "Country",
    director: "Director",
    runtime: "Runtime",
    budget: "Budget",
    popularity: "Popularity",
    rating: "Rating",
  },

  // Popularity labels
  popularity: {
    low: "Low",
    medium: "Medium",
    high: "High",
    veryHigh: "Very high",
    mega: "Mega",
  },

  // Hints
  hints: {
    title: "Hints",
    directorStartsWith: (letter: string) => `Director starts with: ${letter}`,
    genreIs: (genre: string) => `One of the genres: ${genre}`,
    fromDecade: (decade: number) => `The film is from the ${decade}s.`,
    countryIs: (country: string) => `Country of origin: ${country}`,
    tagline: (tagline: string) => `Tagline: "${tagline}"`,
    overview: (text: string) => `Synopsis: ${text}...`,
    directorInitials: (initials: string) => `Director initials: ${initials}`,
    titleStartsWith: (letter: string) => `Title starts with: "${letter}"`,
    titleLength: (length: number) => `Title has ${length} characters`,
  },

  // Result screen
  result: {
    title: "Result",
    youGuessed: "You guessed it!",
    theAnswerWas: "The answer was",
    attempts: "Attempts",
    hintsUsed: "Hints used",
    accuracy: "Accuracy",
    share: "Share Result",
    copied: "Copied!",
    playAgain: "Play Again",
    shareText: (title: string, attempts: number, max: number) =>
      `Showle - Daily Movie\n\nI guessed "${title}" in ${attempts}/${max} attempts!\n\nhttps://showle.app`,
  },

  // Auth
  auth: {
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    name: "Username",
    namePlaceholder: "John Doe",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    passwordMin: "Password must be at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    invalidCredentials: "Invalid email or password.",
    emailInUse: "This email is already in use.",
  },

  // Language
  lang: {
    label: "Language",
    pl: "Polski",
    en: "English",
  },
};

export default en;
