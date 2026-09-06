# Plan napraw bezpieczeństwa Showle

Źródło: audyt `cb4226d7-e810-48df-ab79-e4e8e56eb4f1`, bazowy commit `224bc89e535a6402c7c31956b41cf17efd4c036d`.

Zakres: sześć potwierdzonych ustaleń. Implementacja lokalna, bez nowych zależności, bez zmiany sekretów, migracji danych, testowania produkcji ani automatycznego pushowania. Istniejące zmiany użytkownika pozostają nietknięte.

## 1. Rekomendacje: walidacja i koszty AI

- Odczytywać JSON z rzeczywistym limitem bajtów, niezależnym od deklarowanego Content-Length. Odrzucać nieprawidłowe struktury i typy.
- Walidować gatunki według istniejącego katalogu, popularność i język jako zamknięte listy wartości, lata jako uporządkowany zakres, opis do 400 znaków i wykluczenia jako ograniczoną tablicę dodatnich ID.
- Zachować formularz PL/EN, wszystkie obecne gatunki i trzy opcje popularności, wykluczanie obejrzanych filmów oraz maksymalnie osiem rekomendacji.
- Atomowo sprawdzać i zajmować dzienny przydział przed pierwszym wywołaniem AI. Użyć istniejącej tabeli DailyUsage i blokady transakcyjnej, bez nowej migracji. Nie utrzymywać transakcji podczas pracy dostawcy.
- Rozpoczęta próba zużywa przydział także przy braku wyników lub błędzie dostawcy. Błędne dane odrzucane przed rozpoczęciem pracy nie zużywają dziennej kwoty. Zwracać aktualny limit również przy błędach po rezerwacji i odświeżać go w UI.
- Ograniczyć cały prompt i liczbę tokenów odpowiedzi dla tłumaczenia oraz uzasadnień. Nie polegać na samym limicie embeddingu.
- Testy: równoległe żądania przy jednym przydziale; brak wyników; błąd dostawcy; długie pola poza freeformText; zły JSON, typy i zakres lat; poprawne rekomendacje i fallback.

## 2. Rankingi: własność i ograniczona praca bazy

- Walidować cały batch przed zapisem: długość, typy, dodatnie ID/pozycje, unikalność identyfikatorów i pozycji oraz długości metadanych.
- Sprawdzać właściciela listy i przynależność każdego elementu w tej samej transakcji. Każdy zapis musi być ograniczony także przez listId; obcy element powoduje odrzucenie całej operacji.
- Wprowadzić limit dodawania 50 filmów w żądaniu, limit 500 pozycji rankingu i reorder tablicowy do 500 pozycji. Serializować równoległe dodawanie, aby limit listy nie miał wyścigu.
- Przeciąganie wysyła wyłącznie ID filmu i docelową pozycję. Serwer zapisuje całą zmianę kolejności jedną transakcją i jednym parametryzowanym UPDATE, także dla starszych list przekraczających dzisiejszy limit. Nie dzielić przeciągnięcia na niezależne commity.
- Ograniczać budżet liczbą mutacji, nie tylko żądań HTTP. Nie usuwać ani nie skracać istniejących rankingów.
- Zachować pojedyncze dodawanie, pomijanie filmów już obecnych i przeciąganie. Import większej kolekcji dzielić na dozwolone partie, zgłaszać błędy i odświeżać widok zamiast pozornego sukcesu.
- Testy: dwie listy różnych właścicieli; mieszany batch własnych i obcych elementów bez częściowego zapisu; duplikaty; granice limitów; równoległe dodawanie; poprawny reorder i import.

Budżet zapisu: 1000 pozycji/minutę/użytkownika, dodatkowo istniejący limit 30 żądań zapisu/minutę. Duży ruch w starszej liście zużywa najwyżej cały budżet w jednej operacji; jeśli brakuje budżetu, nie zapisuje się żadna część ruchu. Import filmów może zakończyć się po wcześniej dodanych partiach — UI odświeża rzeczywisty stan i pokazuje błąd. Starsze listy nie są usuwane ani automatycznie skracane.

## 3. Pojedynki: wspólny start i ochrona API

- Ujawniać pytanie dopiero po serwerowym roundStartedAt; nie wysyłać kadru, opcji ani nextFramePath przed jego rundą. Poprawna odpowiedź nadal pozostaje ukryta do rozstrzygnięcia.
- Rozdzielić gotowość interfejsu od ładowania jawnego obrazu. Pierwszą rundę uruchamia przycisk gotowości, kolejne automatyczna gotowość klienta; pozostają 3 sekundy odliczania i wspólne 10 sekund na odpowiedź.
- Po upływie odliczania pobierać świeży stan od razu, bez oczekiwania na kolejny zwykły polling. Obsłużyć pobieranie obrazu, błąd i ponowienie. Ładowanie po ujawnieniu nie może przesuwać serwerowego terminu ani dawać dodatkowych punktów.
- Usunąć preload przyszłego kadru również z klienta i zaktualizować zgodne testy/skrypt smoke oraz opisy PL/EN. Jawny preload nie daje się pogodzić z poufnością kadru; szyfrowany preload byłby osobnym, większym rozszerzeniem.
- Dodać wspólny budżet nadużyć przed pracą DB niezależny od dowolnego playerId, dodatkowy limit klienta oraz twardą granicę rozmiaru pamięciowego limitera. Nie opierać bezpieczeństwa wyłącznie na nagłówku IP.
- Nieuczestnik nie może nabywać blokady mutacyjnej pokoju: wstępna kontrola przed transakcją i powtórna kontrola pod blokadą. Zachować kontrolę rundy/meczu, terminu i powtórzonych odpowiedzi.
- Testy: oczekiwanie, jedna gotowość, odliczanie, dokładna chwila startu, feedback, kolejna runda, trening i rewanż; rotacja ID; brak blokady dla nieuczestnika; expiry i ponowna autoryzacja w transakcji; poprawne odpowiedzi obu graczy.

## 4. Weryfikacja i odbiór

1. Najpierw reprodukcje na mockach/izolowanych danych, bez połączenia z właściwą bazą i dostawcami.
2. Po poprawkach: przegląd diffu, TypeScript, testy regresji nadużyć i zwykłych scenariuszy, pełny Vitest oraz ESLint. Sprawdzić build bez uruchamiania operacji bazodanowych; zgłosić ewentualną blokadę środowiska.
3. Jedna niezależna, read-only kontrola gotowego diffu pod kątem pozostałych obejść i regresji; potwierdzenie uwag i ponowne testy.
4. Raport końcowy z wynikami poleceń, zmienionymi plikami, dowodem blokady pierwotnych ścieżek i ograniczeniami. Oryginalny audyt pozostaje niezmieniony.

## Poza tą zmianą: kontrola wdrożenia

- Osobno potwierdzić zaufane nagłówki reverse proxy/WAF i globalne limity między instancjami. Limiter procesowy nie jest globalną ochroną całej infrastruktury.
- Zweryfikować notatkę o dawnym `.env` w historii Git oraz rotacji poświadczeń; sam audyt nie potwierdził wycieku.
- Osobno: CVE zależności, uprawnienia bazy, konfiguracja Clerk/Sentry, retencja danych i izolacja bazy testowej.
- Produkcyjny push/deploy, zmiany poświadczeń i testy obciążeniowe wymagają osobnej decyzji; nie są częścią automatycznej weryfikacji.

## Wykonanie — 6 września 2026

Stan po zakończeniu weryfikacji, przed publikacją: **fixed lokalnie** dla sześciu ścieżek z audytu. Na tym etapie bez commita, pushowania, wdrożenia ani zmian w produkcyjnej bazie. Procedura `fix-finding` obejmowała niezależne rozpoznanie przed zmianami i jeden niezależny przegląd gotowej poprawki. Obie konkretne uwagi z przeglądu zostały usunięte: częściowe zapisy dużego przeciągnięcia i nieprzetłumaczony komunikat błędu.

| Ustalenie | Wdrożona ochrona | Weryfikacja |
| --- | --- | --- |
| Nieatomowy / omijany limit AI | Rezerwacja DailyUsage przed pracą dostawcy; bez zwrotu po rozpoczętej próbie | Równoległe żądania, brak wyników, awaria dostawcy; 8 niezależnych połączeń PostgreSQL |
| Nadmierny prompt AI | JSON do 16 KiB; listy dozwolonych wartości; opis do 400 znaków; prompt uzasadnień do 6000 znaków; wyjście 256/1200 tokenów | Złe typy, długie pola, fałszywy Content-Length, fallback, poprawne PL/EN |
| Przedwczesny podgląd kadru | Brak pytania przed serwerowym startem i brak nextFramePath | Start dokładnie na granicy, oczekiwanie, feedback, kolejna runda, trening, rewanż |
| Rotowanie gracza / blokowanie pokoju | Wspólne budżety przed odczytem body; kontrola uczestnictwa przed i pod blokadą | Rotacja tokenów i IP, brak transakcji dla nieuczestnika, ponowna autoryzacja |
| Zapis cudzej pozycji | Właściciel i wszystkie ID sprawdzane w transakcji; listId także w UPDATE | Obca lista, druga własna lista, mieszany batch bez częściowego zapisu, poprawny zapis SQL |
| Amplifikacja zapisów rankingu | Limity danych i budżetu; zbiorczy UPDATE; atomowy ruch | Granice 50/500, wyścig przy 500 filmach, atomowy ruch w liście 1001 filmów |

### Wyniki kontroli

- `node node_modules/typescript/bin/tsc --noEmit` — PASS.
- `npm test -- --reporter=dot` — PASS: 200 testów. Sześć testów PostgreSQL jest domyślnie pomijanych, by zwykłe uruchomienie nie łączyło się z bazą.
- `npm test -- src/lib/__tests__/postgres-security.integration.test.ts --reporter=verbose` — PASS: osobno 6/6, po jawnym ustawieniu `SHOWLE_SECURITY_PG_TEST=1` i `SHOWLE_SECURITY_PSQL`. Użyto nowego, pustego klastra PostgreSQL 18 na `127.0.0.1:55439`, bazy `showle_security_fix`, użytkownika `showle_security`; klaster jest wyłączony.
- `npm run lint` — PASS.
- `git -c core.safecrlf=false diff --check` i `node --check scripts/smoke-game-flows.mjs` — PASS.
- `npm run build` — PASS. Na czas polecenia DATABASE_URL wskazywał nieaktywny port lokalny, a upload Sentry był wyłączony. Pozostały wcześniejsze ostrzeżenia Next.js o konwencji middleware i statycznym generowaniu dla edge runtime.

Testy PostgreSQL uruchamiają rzeczywiste funkcje biznesowe i SQL przez testowy most psql. Sprawdzają blokady między niezależnymi połączeniami, rollback i składnię zapytań; nie zastępują integracji z wdrożonym adapterem Neon, Clerk ani testu obu urządzeń w przeglądarce. Nie uruchamiano skryptu smoke na bieżącej konfiguracji aplikacji, ponieważ może użyć jej właściwej bazy. Nie wykonywano prawdziwych płatnych wywołań AI ani testów produkcji.

### Kontrola przed przyszłym wdrożeniem

1. Na odizolowanym stagingu sprawdzić Neon/Clerk oraz pełny pojedynek na dwóch urządzeniach, przy wolnym łączu i błędzie obrazu. Kadr jest pobierany dopiero po starcie, więc czas transferu zużywa część serwerowego okna 10 sekund.
2. Sprawdzić nadpisywanie nagłówków IP przez proxy i dostroić limity do ruchu. Obecne stałe limity na proces/minutę: tworzenie/dołączanie 120, odczyt stanu 6000, wspólne akcje/odpowiedzi 600. Dodatkowe limity IP: 20/240/120. Pamięć limitera: maksymalnie 10 000 kluczy; przepełnienie odrzuca nowe klucze zamiast resetować aktywne budżety.
3. Dopiero po osobnej decyzji: commit/push i wdrożenie. Sprawdzić wskaźniki 429/5xx, czas odpowiedzi i koszty AI. Dzienne limity rekomendacji pozostają 20 dla konta i 1 dla gościa; naliczane są rozpoczęte próby, nie tylko udane wyniki.
