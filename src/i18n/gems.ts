export interface GemsCopy {
  title: string;
  currency: string;
  balance: string;
  balanceLabel: (amount: string) => string;
  intro: string;
  earn: string;
  daily: string;
  dailyHint: string;
  participation: (amount: number) => string;
  streak: string;
  streakHint: string;
  badges: string;
  badgesHint: string;
  ratings: string;
  ratingsHint: string;
  higherLower: string;
  higherLowerHint: string;
  milestone: (target: number, amount: number) => string;
  dailyRange: (minimum: number, maximum: number) => string;
  badgeRange: (minimum: number, maximum: number) => string;
  recent: string;
  empty: string;
  credited: string;
  reward: string;
  loadError: string;
  dailyReward: string;
  participationReward: string;
  badgeReward: (badge: string) => string;
  ratingReward: (target: number) => string;
  higherLowerReward: (target: number) => string;
  otherReward: string;
}

export const gemsPl: GemsCopy = {
  title: "Niebieskie gemy",
  currency: "Gemy",
  balance: "Twoje gemy",
  balanceLabel: (amount) => `Niebieskie gemy: ${amount}`,
  intro: "Graj, odkrywaj filmy i zdobywaj odznaki. Gemy trafiają na Twoje konto automatycznie.",
  earn: "Jak zbierać gemy?",
  daily: "Film dnia",
  dailyHint: "Im mniej prób potrzebujesz, tym więcej gemów zdobędziesz. Nagroda raz dziennie.",
  participation: (amount) => `Bez trafienia: +${amount} za ukończenie gry po co najmniej jednej próbie.`,
  streak: "Seria w filmie dnia",
  streakHint: "Dodatkowy bonus za kolejne dni z odgadniętym filmem.",
  badges: "Odznaki",
  badgesHint: "Każda zdobyta odznaka daje jednorazową nagrodę. Wcześniej zdobyte odznaki też się liczą.",
  ratings: "Oceniaj obejrzane filmy",
  ratingsHint: "Jednorazowe nagrody za 10, 25 i 100 ocenionych filmów w kolekcji.",
  higherLower: "Więcej czy mniej",
  higherLowerHint: "Zdobądź odznakę za serię 10 trafień i kolejne bonusy za rekord 25 oraz 50.",
  milestone: (target, amount) => `${target}: +${amount}`,
  dailyRange: (minimum, maximum) => `+${minimum} do ${maximum}`,
  badgeRange: (minimum, maximum) => `+${minimum} do ${maximum}`,
  recent: "Ostatnio zdobyte",
  empty: "Pierwsze gemy czekają na Ciebie. Zacznij od filmu dnia lub pierwszej odznaki.",
  credited: "Przyznano",
  reward: "Nagroda",
  loadError: "Nie udało się wczytać gemów.",
  dailyReward: "Odgadnięty film dnia",
  participationReward: "Ukończony film dnia",
  badgeReward: (badge) => `Odznaka: ${badge}`,
  ratingReward: (target) => `${target} ocenionych filmów`,
  higherLowerReward: (target) => `Więcej czy mniej: rekord ${target}`,
  otherReward: "Nagroda za aktywność",
};

export const gemsEn: GemsCopy = {
  title: "Blue gems",
  currency: "Gems",
  balance: "Your gems",
  balanceLabel: (amount) => `Blue gems: ${amount}`,
  intro: "Play, discover movies and earn badges. Gems are added to your account automatically.",
  earn: "How to collect gems",
  daily: "Daily Movie",
  dailyHint: "Guess the movie in fewer attempts to earn more gems. One reward per day.",
  participation: (amount) => `No correct guess: +${amount} for completing the game after at least one attempt.`,
  streak: "Daily Movie streak",
  streakHint: "An extra bonus for consecutive days with a correct guess.",
  badges: "Badges",
  badgesHint: "Each unlocked badge grants a one-time reward. Previously earned badges count too.",
  ratings: "Rate watched movies",
  ratingsHint: "One-time rewards for rating 10, 25 and 100 movies in your collection.",
  higherLower: "Higher or lower",
  higherLowerHint: "Earn a badge for 10 correct guesses in a row, then more bonuses at a best streak of 25 and 50.",
  milestone: (target, amount) => `${target}: +${amount}`,
  dailyRange: (minimum, maximum) => `+${minimum} to ${maximum}`,
  badgeRange: (minimum, maximum) => `+${minimum} to ${maximum}`,
  recent: "Recently earned",
  empty: "Your first gems are waiting. Start with the daily movie or your first badge.",
  credited: "Awarded",
  reward: "Reward",
  loadError: "Couldn't load your gems.",
  dailyReward: "Daily Movie solved",
  participationReward: "Daily Movie completed",
  badgeReward: (badge) => `Badge: ${badge}`,
  ratingReward: (target) => `${target} rated movies`,
  higherLowerReward: (target) => `Higher or lower: best streak ${target}`,
  otherReward: "Activity reward",
};
