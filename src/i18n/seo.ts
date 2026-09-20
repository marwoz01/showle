export const seoCopy = {
  pl: {
    "/": ["Showle · Film dnia", "Odgadnij film dnia, zaproś znajomego na filmowy pojedynek i odkryj tytuł na wieczór."],
    "/play": ["Gry filmowe", "Wybierz film dnia, pojedynek ze znajomym albo trening rozpoznawania filmowych kadrów."],
    "/play/movie": ["Film dnia", "Siedem prób, filmowe wskazówki i nowe wyzwanie każdego dnia. Zagraj bez zakładania konta."],
    "/play/duel": ["Filmowy pojedynek", "Zaproś znajomego i sprawdźcie, kto szybciej rozpoznaje filmy po kadrach."],
    "/play/practice": ["Trening filmowych kadrów", "Ćwicz rozpoznawanie filmów po kadrach w krótkich rundach solo."],
    "/play/higher-lower": ["Więcej czy mniej?", "Zgaduj, który film jest nowszy, porównuj lata premier i pobij swój rekord."],
    "/recommend": ["Co dziś obejrzeć?", "Znajdź film na wieczór na podstawie ulubionych tytułów, nastroju i swoich serwisów streamingowych w Polsce."],
    "/credits": ["Źródła i autorstwo", "Źródła danych filmowych, dostępności i materiałów wykorzystanych w Showle."],
  },
  en: {
    "/": ["Showle · Daily Movie", "Guess the daily movie, invite a friend to a movie duel, and discover something to watch tonight."],
    "/play": ["Movie games", "Choose the daily movie challenge, a duel with a friend, or solo movie-frame practice."],
    "/play/movie": ["Daily movie", "Seven guesses, movie clues, and a new challenge every day. Play without an account."],
    "/play/duel": ["Movie duel", "Invite a friend and see who recognizes movies from their frames first."],
    "/play/practice": ["Movie frame practice", "Practice recognizing movies from their frames in short solo rounds."],
    "/play/higher-lower": ["Higher or lower?", "Guess which movie is newer, compare release years and beat your best streak."],
    "/recommend": ["What to watch tonight", "Find a movie using your favorites, mood, and streaming services available in Poland."],
    "/credits": ["Sources and credits", "Sources of movie metadata, availability, and materials used in Showle."],
  },
} as const;
export type PublicPagePath = keyof typeof seoCopy.pl;
