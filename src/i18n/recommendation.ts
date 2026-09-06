export interface RecommendationCopy {
  advanced: string; anyPopularity: string; anyPopularityDesc: string;
  excludedGenres: string; maxRuntime: string; noRuntimeLimit: string; minutes: (count: number) => string;
  providers: string; providersHint: string; reference: string; referencePlaceholder: string;
  removeReference: string; referenceUnavailable: string; referenceSelected: string;
  moreLikeThis: string; notForMe: string; feedbackSaved: string; feedbackError: string; clearFeedback: string;
  partial: (count: number) => string; exhausted: string; degraded: string; personalized: string;
  conflicting: string; rateLimited: string; startYear: string; endYear: string; genresHint: string;
  becauseGenres: (genres: string) => string; becauseReference: (title: string) => string;
  becauseTaste: string; becauseRuntime: (minutes: number) => string;
  becauseProviders: (providers: string) => string; becauseRating: (rating: number, votes: string) => string;
}

export const recommendationPl: RecommendationCopy = {
  advanced: "Doprecyzuj wybór", anyPopularity: "Bez znaczenia", anyPopularityDesc: "Liczy się dopasowanie do Ciebie",
  excludedGenres: "Czego nie chcesz oglądać?", maxRuntime: "Maksymalny czas filmu", noRuntimeLimit: "Bez limitu", minutes: (count) => `${count} min`,
  providers: "Twoje platformy", providersHint: "Abonamenty w Polsce, nie wypożyczenia. Wystarczy dostępność na jednej wybranej platformie. Dane: TMDB / JustWatch.",
  reference: "Coś podobnego do...", referencePlaceholder: "Wyszukaj film, który lubisz", removeReference: "Usuń wybrany film",
  referenceUnavailable: "Nie udało się odczytać wybranego filmu. Spróbuj ponownie lub wybierz inny.", referenceSelected: "Film odniesienia",
  moreLikeThis: "Więcej takich", notForMe: "Nie dla mnie", feedbackSaved: "Uwzględnimy Twój wybór w kolejnych propozycjach.",
  feedbackError: "Nie udało się zapisać wyboru. Spróbuj ponownie.", clearFeedback: "Cofnij wybór",
  partial: (count) => `Znaleźliśmy ${count} nowych propozycji. Zachowaliśmy Twoje wymagania, zamiast dodawać powtórki.`,
  exhausted: "Nie ma już nowych filmów spełniających te wymagania. Zmień preferencje, aby szukać dalej.",
  degraded: "Dopasowanie opisowe jest chwilowo ograniczone. Wybrane filtry i wykluczenia nadal obowiązują.",
  personalized: "Uwzględniliśmy Twoje oceny i wybory.", conflicting: "Wybrany gatunek jest jednocześnie wykluczony w opisie. Popraw preferencje.",
  rateLimited: "Zbyt wiele wyszukiwań. Odczekaj kilka minut i spróbuj ponownie.", startYear: "Od roku", endYear: "Do roku",
  genresHint: "Film powinien pasować do co najmniej jednego wybranego gatunku.",
  becauseGenres: (genres) => `Pasuje do wybranych gatunków: ${genres}.`,
  becauseReference: (title) => `Ma wspólne gatunki, motywy lub reżysera z filmem „${title}”.`,
  becauseTaste: "Gatunki lub twórcy są zgodni z Twoimi wcześniejszymi preferencjami.",
  becauseRuntime: (minutes) => `Trwa ${minutes} min i mieści się w Twoim limicie.`,
  becauseProviders: (providers) => `W abonamencie: ${providers} (Polska, według ostatniej aktualizacji).`,
  becauseRating: (rating, votes) => `Ocena widzów TMDB: ${rating.toLocaleString("pl-PL")}/10 na podstawie ${votes} głosów.`,
};
export const recommendationEn: RecommendationCopy = {
  advanced: "Refine your picks", anyPopularity: "Any popularity", anyPopularityDesc: "Focus on what fits your taste",
  excludedGenres: "What would you rather avoid?", maxRuntime: "Maximum runtime", noRuntimeLimit: "No limit", minutes: (count) => `${count} min`,
  providers: "Your streaming services", providersHint: "Subscriptions in Poland, not rentals. Availability on any selected service is enough. Data: TMDB / JustWatch.",
  reference: "Something like...", referencePlaceholder: "Search for a movie you like", removeReference: "Remove selected movie",
  referenceUnavailable: "Could not load the selected movie. Try again or choose another.", referenceSelected: "Reference movie",
  moreLikeThis: "More like this", notForMe: "Not for me", feedbackSaved: "Your choice will inform the next recommendations.",
  feedbackError: "Could not save your choice. Please try again.", clearFeedback: "Undo choice",
  partial: (count) => `Found ${count} new picks. We kept your requirements instead of adding repeats.`,
  exhausted: "There are no more unseen movies matching these requirements. Change your preferences to keep exploring.",
  degraded: "Description matching is temporarily limited. Your selected filters and exclusions still apply.",
  personalized: "Your ratings and choices informed these picks.", conflicting: "A selected genre is also excluded in your description. Update your preferences.",
  rateLimited: "Too many searches. Wait a few minutes and try again.", startYear: "From year", endYear: "To year",
  genresHint: "Movies should match at least one selected genre.",
  becauseGenres: (genres) => `Matches your selected genres: ${genres}.`,
  becauseReference: (title) => `Shares genres, themes or a director with “${title}”.`,
  becauseTaste: "Its genres or filmmakers align with your previous preferences.",
  becauseRuntime: (minutes) => `Its ${minutes}-minute runtime fits your limit.`,
  becauseProviders: (providers) => `Included with: ${providers} (Poland, at the last update).`,
  becauseRating: (rating, votes) => `TMDB audience rating: ${rating}/10 from ${votes} votes.`,
};
