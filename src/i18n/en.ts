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
    recommend: "Recommendations",
    collection: "Collection",
    sectionMain: "Main",
    sectionDiscover: "Discover",
    sectionMore: "More",
    history: "History",
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
      "Guess the daily movie or discover your perfect pick for tonight — all in one place.",
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
    subtitle: "Guess the daily movie or discover something new — in a few simple steps.",
    step1Title: "Guess the daily movie",
    step1Desc:
      "A new movie to guess every day. Type a title and we'll compare it against the answer across 7 parameters.",
    step2Title: "Read the Clues",
    step2Desc:
      "Each wrong guess reveals a new hint — director initials, genre, country, and more.",
    step3Title: "Discover movies",
    step3Desc:
      "Pick your genres and preferences, and we'll find 5 movies perfectly matched for your evening.",
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
    leadActor: "Lead Actor",
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
    directorIs: (name: string) => `Director: ${name}`,
    genreIs: (genre: string) => `One of the genres: ${genre}`,
    genresAre: (genres: string) => `Genres: ${genres}`,
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

  // Recommendations
  recommend: {
    title: "What to Watch Tonight?",
    subtitle: "Popcorn ready, blanket on — tell us what you're in the mood for and we'll handle the rest.",
    modeTitle: "What to Watch?",
    modeDesc: "Got the snacks but no movie? Tell us what you like and we'll pick something perfect for tonight.",
    genresLabel: "What are you into?",
    selectGenre: "Select at least 1 genre",
    yearLabel: "Release year",
    popularityLabel: "How well-known?",
    popularityPopular: "Big hits",
    popularityMedium: "Under the radar",
    popularityNiche: "Hidden gems",
    submit: "Find my movies",
    loading: "Don't eat all the popcorn yet... your picks are almost ready!",
    noResults: "Hmm, nothing fits. Try tweaking your preferences — something great might pop up!",
    error: "Something went wrong. Give it another try in a moment.",
    tryAgain: "Show me different movies",
    changePreferences: "Change Preferences",
    justification: "Why this movie?",
    director: "Director",
    rating: "Rating",
    getRecommendations: "Find my movies",
    topPick: "Top Pick",
    whyRecommend: "Why we recommend this",
    ctaSubtext: "You'll get 5 personalized recommendations",
    popularityPopularDesc: "Well-known blockbusters",
    popularityMediumDesc: "Appreciated by cinephiles",
    popularityNicheDesc: "Hidden gems to discover",
    yearPresets: "Quick pick",
    yearAny: "Any",
  },

  // Collection
  collection: {
    title: "My Collection",
    tabs: {
      watched: "Watched",
      watchlist: "Watchlist",
      rankings: "Rankings",
    },
    addMovie: "Add movie",
    popularMovies: "Popular movies",
    addSelected: (count: number) => `Add selected (${count})`,
    searchPlaceholder: "Search for a movie...",
    markWatched: "Mark as watched",
    moveToWatchlist: "Move to watchlist",
    removeMovie: "Remove from collection",
    removeConfirm: "Are you sure you want to remove this movie from your collection?",
    rating: "Rating",
    review: "Review",
    reviewPlaceholder: "Write your thoughts about this movie...",
    writeReview: "Write a review",
    editReview: "Edit review",
    saveReview: "Save",
    noReview: "No review yet",
    sortBy: "Sort by",
    sortDate: "Date added",
    sortRating: "Rating",
    sortTitle: "Title",
    sortYear: "Year",
    emptyWatched: "No watched movies yet. Add your first one!",
    emptyWatchlist: "Your watchlist is empty. Save movies for later!",
    emptyRankings: "No rankings yet. Create your first one!",
    createList: "New ranking",
    listName: "Ranking name",
    listNamePlaceholder: "e.g. Top 10 Sci-Fi",
    listDescription: "Description (optional)",
    deleteList: "Delete ranking",
    deleteListConfirm: "Are you sure you want to delete this ranking?",
    addToList: "Add to ranking",
    addFromCollection: "Add from collection",
    addAllWatched: "All watched movies",
    addAllWatchlist: "All from watchlist",
    addedCount: (added: number, skipped: number) =>
      `Added ${added}${skipped > 0 ? `, skipped ${skipped} (already in ranking)` : ""}`,
    position: "Position",
    saved: "Saved",
    alreadySaved: "Already saved",
    addToCollection: "Add to collection",
    chooseCategory: "Choose category",
    watched: "Watched",
    watchlist: "Watchlist",
    movieCount: (count: number) =>
      `${count} ${count === 1 ? "movie" : "movies"}`,
    confirmAction: "Confirm",
    cancel: "Cancel",
  },

  // History
  history: {
    title: "Game History",
    totalGames: "games",
    filterAll: "All",
    filterWon: "Won",
    filterLost: "Lost",
    columnMovie: "Movie",
    columnResult: "Result",
    columnAttempts: "Attempts",
    columnHints: "Hints",
    columnDate: "Date",
    resultWon: "Won",
    resultLost: "Lost",
    review: "Review",
    reviewTitle: "Game Review",
    noGames: "You haven't completed any games yet.",
    loading: "Loading...",
    previousPage: "Previous",
    nextPage: "Next",
    pageOf: "of",
    attempts: "Attempts",
    hintsUsed: "Hints",
  },

  // Language
  lang: {
    label: "Language",
    pl: "Polski",
    en: "English",
  },
};

export default en;
