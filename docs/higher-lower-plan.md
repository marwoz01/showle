# Więcej czy mniej? — plan wdrożenia

## Cel i zakres pierwszej wersji

Nowy tryb `/play/higher-lower`: porównywanie czasu trwania dwóch filmów,
bez limitu czasu, do pierwszej pomyłki. Dostępny również bez konta, po polsku
i angielsku. Wejścia na stronie głównej i w wyborze trybów `/play`.

Referencja wizualna: dostarczony zrzut Verso. Dwa duże, przyciemnione kadry,
wyśrodkowane tytuły i duże wartości. Znany czas po lewej, znak zapytania
i przyciski „Dłuższy” / „Krótszy” po prawej. Zachowujemy kolory, fonty
i nawigację Showle; akcent fioletowy, zielony sukces i czerwony błąd.

## Zasady i przepływ

1. Otwarcie trybu tworzy serię albo wznawia sesję w bieżącej karcie.
2. Pierwszy film pokazuje tytuł, rok, kadr i czas w minutach; drugi ukrywa czas.
3. Jedna odpowiedź blokuje kolejne kliknięcia do zakończenia żądania.
4. Serwer odsłania dokładny czas. Poprawna odpowiedź dodaje punkt.
   Równe czasy zaliczają obie odpowiedzi i pokazują komunikat o remisie.
5. „Następny film” przenosi dotychczasowy prawy film w lewo i dobiera nowy.
   Jawny przycisk daje czas na przeczytanie wyniku i obsługę czytnikiem ekranu.
6. Pomyłka kończy serię. Oba czasy pozostają widoczne; wynik, rekord,
   kopiowanie wyniku i „Jeszcze raz” są dostępne na ekranie.
7. Restart tworzy nową sekwencję. Rekord jest lokalny dla urządzenia/przeglądarki
   i dotyczy tylko tej kategorii; nie wpływa na monety ani statystyki filmu dnia.

## Dobór filmów i danych

- Wersjonowany katalog TMDB przygotowany przed rozgrywką: rozpoznawalne,
  wydane filmy pełnometrażowe, wiarygodny dodatni czas i kadr panoramiczny.
- Osobny importer aktualizuje katalog bez zmieniania istniejącego katalogu kadrów.
  Pochodzenie i data odświeżenia są zapisane w danych.
- Początek preferuje wyraźne różnice; wraz z serią dopuszczamy bliższe czasy.
  Unikamy wymuszania porównań różniących się jedną minutą.
- Filmy nie powtarzają się przed wykorzystaniem puli; po jej wyczerpaniu
  nowy cykl nie zestawia filmu z nim samym.
- Porównujemy dokładnie wartości ze snapshotu, nie zaokrąglone godziny.
  Warianty montażowe nie są osobnymi odpowiedziami; źródłem jest runtime TMDB.

## Architektura

- `src/types/higher-lower.ts`: kontrakt żądania, publicznego widoku i odpowiedzi.
- `src/lib/higher-lower*.ts`: katalog serwerowy, dobór par, przejścia stanów,
  uwierzytelnione szyfrowanie tokenu sesji i walidacja danych wejściowych.
- `POST /api/higher-lower`: start, wznowienie, odpowiedź i kolejna runda.
  Serwer ustala wynik i prawdziwy czas; przeglądarka nie otrzymuje ukrytej wartości
  ani całego katalogu odpowiedzi. Odpowiedzi HTTP mają `Cache-Control: no-store`.
- Stan serii podróżuje w zaszyfrowanym, uwierzytelnionym tokenie z terminem ważności.
  Opcjonalny `HIGHER_LOWER_SECRET`; domyślnie klucz wydzielony z istniejącego
  `CLERK_SECRET_KEY`. W produkcji brak klucza blokuje tworzenie sesji.
- Token w `sessionStorage`, rekord w `localStorage`; niedostępny storage
  nie blokuje bieżącej gry. Rekord pozostaje osobistym wynikiem, nie rankingiem.
- Bez migracji bazy i bez wywołań TMDB podczas rundy. Ten model bez stanu
  po stronie serwera nie zabezpiecza przed powtarzaniem wcześniejszych tokenów;
  ranking publiczny lub nagrody wymagają trwałego, atomowego zapisu odpowiedzi.
- Ograniczenia wielkości żądań, tempa wywołań i dopuszczalnych przejść stanów.

## Interfejs i dostępność

- Desktop: dwie równe połowy ekranu gry, dyskretne „VS”, seria i rekord w nagłówku.
- Telefon: kadry jeden nad drugim, widoczne oba tytuły i duże przyciski odpowiedzi.
  Krótkie ekrany mogą przewijać zawartość bez obcinania kontrolek.
- Przejście prawego filmu na lewo, krótka animacja odsłonięcia wartości;
  respektowanie `prefers-reduced-motion`.
- Tab/Enter do wszystkich akcji, opcjonalne strzałki góra/dół do odpowiedzi,
  fokus klawiatury, komunikaty wyniku przez `aria-live` i etykiety ikon.
- Stan ładowania, błędu sieci, limitu wywołań i wygasłej sesji z odpowiednią akcją.
  Błąd sieci zachowuje poprzednią parę i umożliwia ponowienie.
- Zasady dostępne z poziomu gry; informacja o lokalnym rekordzie i źródle danych.

## Kolejność realizacji i akceptacja

- [x] Przygotować katalog i powtarzalny importer (349 filmów, snapshot 2026-09-07).
- [x] Zaimplementować silnik, API, walidację tokenów i testy zachowania.
- [x] Zbudować ekran, obsługę sesji, rekord, restart i kopiowanie wyniku.
- [x] Dodać wejścia w aplikacji i komplet tekstów PL/EN.
- [x] Sprawdzić trafienie, błąd, remis, przejście filmu, restart i ukrycie odpowiedzi.
- [x] Sprawdzić lint, typy, istotne testy oraz kompilację trasy.
- [ ] Sprawdzić desktop/mobile w przeglądarce, jeśli jest dostępna w środowisku.

Podgląd bieżącego serwera developerskiego: `http://localhost:3010/play/higher-lower`.
Test HTTP rzeczywistej aplikacji potwierdza start z ukrytą odpowiedzią, trafienie,
przeniesienie filmu do następnej pary, wznowienie sesji po angielsku,
odrzucenie zmodyfikowanego tokenu i odpowiedź 200 ekranu gry. Drugi przebieg
potwierdza zakończenie po błędzie, wznowienie zakończonej gry, wyzerowanie nowej
serii i poprawne ładowanie kadru przez optymalizację obrazów Next.js.
Wyniki kontroli: 41 testów w 5 plikach przechodzi, ESLint bez błędów,
TypeScript oraz pełny build produkcyjny kończą się powodzeniem.
Automatyczny test wizualny pozostaje niewykonany: narzędzie przeglądarkowe
nie udostępnia w tej sesji żadnej przeglądarki.

Aktualizacja katalogu: `npm run higher-lower:sync -- --limit=350 --refresh`.
Importer używa istniejącego `TMDB_API_KEY`; zwykła rozgrywka go nie potrzebuje.

## Następne etapy (po pierwszej wersji)

1. **Rok premiery**: osobna kategoria i rekord, przyciski „Nowszy” / „Starszy”;
   rok znika z metadanych ukrytego filmu. Remis traktowany jak obecnie.
2. **Przychód kinowy**: tylko dane o światowym przychodzie, bez korekty o inflację,
   filtrowanie zer i braków, jawne jednostki; porównanie tych samych wartości,
   które użytkownik widzi po sformatowaniu.
3. **Codzienne wyzwanie**: 10 wspólnych porównań, jedna próba dziennie,
   gra do końca mimo błędów, granice dnia Europe/Warsaw, udostępniana siatka.
   Zamrożony zestaw i trwały zapis odpowiedzi po stronie serwera.
4. **Pojedynek i ranking**: identyczna kolejność par, jednoznaczna polityka czasu,
   transakcyjne odpowiedzi, obsługa rozłączeń i zabezpieczenie powtórzeń.
   Dopiero wtedy ewentualne nagrody i wspólne statystyki.

Żaden z tych etapów nie jest prezentowany jako działająca funkcja pierwszej wersji.
