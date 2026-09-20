export const accountCopy = {
  pl: {
    title: "Konto i dane", description: "Zarządzaj swoim kontem i danymi zapisanymi w Showle.",
    export: "Pobierz moje dane", exporting: "Przygotowujemy plik...",
    exportHint: "Plik JSON zawiera kolekcję, rankingi, historię gier, oceny i preferencje zapisane na koncie.",
    manage: "Zarządzaj kontem", manageHint: "Zmień dane logowania lub usuń konto.",
    clear: "Wyczyść dane Showle", clearHint: "Usuń kolekcję, rankingi, wyniki gier, monety i preferencje. Konto pozostanie aktywne.",
    confirm: "Czy usunąć wszystkie Twoje dane Showle? Tej czynności nie można cofnąć. Najpierw możesz pobrać kopię.",
    error: "Nie udało się wykonać operacji. Spróbuj ponownie później.",
    rateLimit: "Limit operacji został osiągnięty. Spróbuj ponownie za godzinę.",
  },
  en: {
    title: "Account and data", description: "Manage your account and information saved in Showle.",
    export: "Download my data", exporting: "Preparing your file...",
    exportHint: "The JSON file includes your collection, rankings, game history, ratings and saved preferences.",
    manage: "Manage account", manageHint: "Change your sign-in details or delete your account.",
    clear: "Clear my Showle data", clearHint: "Delete your collection, rankings, game results, coins and preferences. Your account stays active.",
    confirm: "Delete all your Showle data? This cannot be undone. You can download a copy first.",
    error: "Could not complete this action. Please try again later.",
    rateLimit: "The action limit has been reached. Please try again in an hour.",
  },
} as const;
