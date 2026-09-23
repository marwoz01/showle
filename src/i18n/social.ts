export const socialPl = {
  title: "Znajomi", subtitle: "Filmy są jeszcze lepsze, kiedy jest z kim o nich porozmawiać.",
  friends: "Znajomi", following: "Obserwowani", followers: "Obserwujący", requests: "Zaproszenia",
  incoming: "Otrzymane zaproszenia", outgoing: "Wysłane zaproszenia", emptyFriends: "Zaproś pierwszą osobę lub znajdź kogoś poniżej.",
  emptyFollowing: "Obserwuj publiczny profil, aby widzieć udostępnianą aktywność.", emptyFollowers: "Jeszcze nikt Cię nie obserwuje.", emptyRequests: "Nie masz oczekujących zaproszeń.",
  find: "Znajdź osobę", search: "Szukaj po nazwie…", searchHint: "Wyszukujemy publiczne profile. Prywatnego znajomego dodasz przez jego link lub kod.",
  noResults: "Nie znaleźliśmy publicznych profili o tej nazwie.", loading: "Wczytywanie…", invite: "Zaproś znajomego", inviteHint: "Podeślij znajomemu swój link lub kod, żeby mógł Cię dodać. Możesz mieć prywatny profil — zaproszenie trafi do Ciebie do akceptacji.",
  inviteCode: "Twój kod znajomego", copyInvite: "Kopiuj zaproszenie", copied: "Zaproszenie skopiowane.", copyError: "Skopiuj kod lub link z pola poniżej.",
  enterCode: "Link lub kod znajomego", codePlaceholder: "Wklej link albo kod…", findCode: "Znajdź po kodzie", invalidCode: "Wpisz poprawny kod lub link do profilu Showle.",
  unavailable: "Nie udało się znaleźć tej osoby. Sprawdź kod.", follow: "Obserwuj", unfollow: "Przestań obserwować", followsYou: "Obserwuje Cię", followingLabel: "Obserwujesz",
  request: "Dodaj do znajomych", accept: "Przyjmij", decline: "Odrzuć", cancel: "Anuluj zaproszenie", remove: "Usuń ze znajomych", removeConfirm: "Usunąć tę osobę ze znajomych? Utracicie dostęp do prywatnych profili i aktywności dla znajomych.",
  confirmRemove: "Tak, usuń", keep: "Zostaw", friendsLabel: "Znajomi", pending: "Zaproszenie wysłane", own: "To Twój profil", view: "Zobacz profil", private: "Profil prywatny",
  signIn: "Zaloguj się, aby dodać znajomego lub obserwować", saved: "Zapisano zmianę.", feed: "Co oglądają znajomi", feedHint: "Ostatnio oznaczone jako obejrzane u znajomych i obserwowanych osób.",
  watched: "Oznaczono jako obejrzany", rated: "Oceniono film", rating: "Ocena", refresh: "Odśwież", activity: "Ostatnio obejrzane", filmProfile: "Profil filmowy",
  visibility: "Kto widzi moją aktywność filmową?", visibilityHint: "Udostępniasz tytuły oznaczone jako obejrzane i ich oceny. Lista do obejrzenia oraz recenzje pozostają prywatne. Profil prywatny zawsze ogranicza dostęp do zaakceptowanych znajomych.",
  visibilityPrivate: "Tylko ja", visibilityFriends: "Znajomi", visibilityPublic: "Każdy, kto może otworzyć mój profil", friendPrivacy: "Zaakceptowani znajomi mają dostęp do statystyk i ulubionych filmów również przy prywatnym profilu. Znajomość możesz zakończyć w zakładce Znajomi.",
  unavailableActivity: "Ta osoba nie udostępnia aktywności lub nie dodała jeszcze obejrzanych filmów.",
};

export type SocialCopy = { [K in keyof typeof socialPl]: string };

export const socialEn: SocialCopy = {
  title: "Friends", subtitle: "Movies are even better when you have someone to talk about them with.",
  friends: "Friends", following: "Following", followers: "Followers", requests: "Requests",
  incoming: "Received requests", outgoing: "Sent requests", emptyFriends: "Invite your first friend or find someone below.",
  emptyFollowing: "Follow a public profile to see the activity they share.", emptyFollowers: "No one is following you yet.", emptyRequests: "You have no pending requests.",
  find: "Find someone", search: "Search by name…", searchHint: "Search finds public profiles. Add a private friend using their link or code.",
  noResults: "No public profiles match that name.", loading: "Loading…", invite: "Invite a friend", inviteHint: "Send a friend your link or code so they can add you. Your profile can stay private — you'll get a request to accept.",
  inviteCode: "Your friend code", copyInvite: "Copy invitation", copied: "Invitation copied.", copyError: "Copy the code or link from the field below.",
  enterCode: "Friend's link or code", codePlaceholder: "Paste a link or code…", findCode: "Find by code", invalidCode: "Enter a valid Showle profile link or code.",
  unavailable: "Couldn't find this person. Check the code.", follow: "Follow", unfollow: "Unfollow", followsYou: "Follows you", followingLabel: "Following",
  request: "Add friend", accept: "Accept", decline: "Decline", cancel: "Cancel request", remove: "Remove friend", removeConfirm: "Remove this friend? You will lose access to each other's private profiles and friends-only activity.",
  confirmRemove: "Yes, remove", keep: "Keep friend", friendsLabel: "Friends", pending: "Request sent", own: "This is your profile", view: "View profile", private: "Private profile",
  signIn: "Sign in to add friends or follow", saved: "Change saved.", feed: "What friends are watching", feedHint: "Films recently marked as watched by friends and people you follow.",
  watched: "Marked as watched", rated: "Rated a film", rating: "Rating", refresh: "Refresh", activity: "Recently watched", filmProfile: "Film profile",
  visibility: "Who can see my film activity?", visibilityHint: "This shares films marked as watched and their ratings. Your watchlist and reviews remain private. A private profile always limits access to accepted friends.",
  visibilityPrivate: "Only me", visibilityFriends: "Friends", visibilityPublic: "Anyone who can open my profile", friendPrivacy: "Accepted friends can see your stats and favourite films even when your profile is private. You can end a friendship in the Friends tab.",
  unavailableActivity: "This person has not shared any watched films yet or keeps their activity private.",
};
