# Ikony i animacje pojedynku

Ikony są importowane przez `src/components/ui/icons.tsx`. Adapter utrzymuje istniejące rozmiary i kolory. Animacja odtwarza się raz po pojawieniu się ikony na ekranie oraz po najechaniu na cały przycisk/link, dotknięciu lub uzyskaniu fokusu klawiaturą. Szybkie dotknięcie nie urywa gestu. Ikony kart trybów mają `idle`, czyli powtórzenie z 4-sekundową przerwą między 2-sekundowymi oknami animacji. Pozostałe ikony powtarzają gest tylko podczas interakcji. Obserwator widoczności wstrzymuje animacje poza ekranem i w ukrytej karcie. Zmiany `prefers-reduced-motion` są obsługiwane na żywo. Jawne `animate={false}` wyłącza automatyczne wyzwalanie.

33 gotowe ikony i ich wrapper pochodzą z [Animate UI](https://animate-ui.com/docs/icons/get-started), commit `efeb96ffd7a3b7a4868667e4ac3c346620fb3044`. Kod jest w `src/components/animate-ui`, z zachowaną licencją. Zmieniono ścieżki importów oraz dodano typ ref SVG dla React 19. Wrapper Slot korzysta z cache komponentów na poziomie modułu, aby zachować ich tożsamość między renderami. Symbole niewystępujące w tej wersji Animate UI (m.in. trofeum, miecze, zakładka) używają SVG Lucide i animacji rysowania z wrappera Animate UI. Pliki te mają komentarz o pochodzeniu i osobną licencję Lucide. Ikona Film używa Clapperboard.

Nie należy mieszać bezpośrednich importów `lucide-react` z adapterem w elementach interfejsu.

Punkty pojedynku animuje GSAP `useGSAP` z lokalnymi referencjami i cleanupem: naliczanie zdobytych punktów, przelot do wyniku danego gracza i krótkie podbicie licznika. Animacja ma około 1,2 s, mieści się w istniejącym czasie podsumowania i nie wpływa na wynik zapisany przez serwer. Przy ograniczeniu ruchu lub spóźnionym odtworzeniu rundy wynik pojawia się od razu.

Odpowiedzi są utrwalane w `DuelRoom.hostAnswerIndex` i `guestAnswerIndex` (migracja `20260906_duel_answer_choices`). API ujawnia wybór przeciwnika dopiero po obu odpowiedziach lub upływie czasu. Do tego momentu ukrywa także przyrost punktów — zmiana licznika nie może podpowiadać poprawnej odpowiedzi. Własny wybór można przywrócić po odświeżeniu strony.
