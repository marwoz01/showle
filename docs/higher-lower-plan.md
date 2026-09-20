# Więcej czy mniej? — rok premiery

## Zakres

Tryb `/play/higher-lower` porównuje lata premier dwóch filmów. Gracz wybiera,
czy drugi film jest „Nowszy”, czy „Starszy”. Gra trwa do pierwszej pomyłki,
bez limitu czasu. Jest dostępna również bez konta, po polsku i angielsku,
ze strony głównej oraz wyboru trybów `/play`.

Rok premiery zastępuje wcześniejsze porównywanie czasu trwania. Rekordy
i zapisane sesje obu wersji pozostają oddzielone.

## Zasady i przepływ

1. Otwarcie trybu tworzy serię albo wznawia sesję w bieżącej karcie.
2. Lewy film pokazuje tytuł, kadr i rok premiery. Prawy pokazuje tytuł, kadr
   i znak zapytania; jego rok nie trafia do przeglądarki przed odpowiedzią.
3. „Nowszy” oznacza wyższy rok, „Starszy” — niższy. Jedna odpowiedź blokuje
   kolejne kliknięcia do zakończenia żądania.
4. Serwer odsłania rok. Poprawna odpowiedź dodaje punkt. Przy tym samym roku
   obie odpowiedzi są poprawne i pojawia się komunikat o remisie.
5. „Następny film” przenosi prawy film w lewo i dobiera nowy.
6. Pomyłka kończy serię. Oba lata pozostają widoczne; można skopiować wynik
   lub rozpocząć nową serię przez „Jeszcze raz”.
7. Rekord jest lokalny dla urządzenia/przeglądarki. Nie wpływa na monety
   ani statystyki filmu dnia.

## Katalog i dobór par

- Katalog TMDB zawiera 349 filmów z lat 1957–2024, z tytułami PL/EN i kadrami.
  Rozgrywka odczytuje zapisany snapshot; nie wywołuje TMDB podczas rundy.
- Źródłem porównania jest rok z pola `release_date` TMDB zapisany w katalogu.
  Czas trwania nie uczestniczy w porównywaniu ani walidacji katalogu gry.
- Początek preferuje wyraźne różnice lat; dłuższa seria dopuszcza bliższe lata.
  Dobór równoważy starsze i nowsze filmy, kiedy dostępne są oba kierunki.
- Filmy nie powtarzają się przed wykorzystaniem puli. Kolejne cykle zachowują
  okno ostatnio pokazanych filmów i nie zestawiają filmu z nim samym.
- Zmiana lat, składu katalogu lub porównywanej cechy unieważnia stare sesje,
  aby nie zmieniać odpowiedzi w trakcie rozgrywki.

Aktualizacja katalogu: `npm run higher-lower:sync -- --limit=350 --refresh`.
Importer wymaga `TMDB_API_KEY`; zwykła rozgrywka go nie potrzebuje.
Importer działa osobno od katalogu kadrów i zachowuje pochodzenie oraz datę danych.

## Architektura i zapis

- `src/types/higher-lower.ts`: kontrakt żądań i publicznego widoku.
  Rok prawego filmu ma wartość `null` podczas zgadywania.
- `src/lib/higher-lower*.ts`: katalog, dobór par, przejścia stanów, walidacja
  oraz uwierzytelnione szyfrowanie tokenu sesji.
- `POST /api/higher-lower`: start, wznowienie, odpowiedź i kolejna runda.
  Serwer ustala wynik; odpowiedzi mają `Cache-Control: no-store`.
- Token ma termin ważności. Klucz pochodzi z `HIGHER_LOWER_SECRET` albo
  `CLERK_SECRET_KEY`. W produkcji brak klucza blokuje tworzenie sesji.
- Token trafia do `sessionStorage`, rekord do `localStorage`, pod osobnymi
  kluczami dla roku premiery. Niedostępny storage nie blokuje bieżącej gry.
- Gra nie wymaga migracji bazy. Tokeny są bezstanowe i mogą być powtarzane;
  osobisty rekord nie stanowi dowodu wyniku dla publicznego rankingu.

## Kompaktowy interfejs i dostępność

- Dwa duże, przyciemnione kadry, tytuły i lata premier; na telefonie kadry
  ustawione jeden pod drugim. Przyciski: „Nowszy” / „Starszy”.
- Nagłówek zawiera powrót do trybów oraz ikony płomienia i pucharu z liczbami.
  Etykiety serii i rekordu pozostają dostępne dla czytników ekranu.
- Usunięto widoczny tytuł gry, napis o czasie trwania i nieskończonej grze,
  informację „Bez limitu czasu”, przycisk „Jak grać” i podpowiedź strzałek.
- Strzałki góra/dół nadal pozwalają odpowiedzieć. Tab/Enter obsługują akcje;
  fokus, komunikaty `aria-live` i ograniczenie ruchu pozostają obsługiwane.
- Błędy sieci, limit wywołań i wygaśnięcie sesji mają odpowiednie akcje naprawcze.
  Błąd sieci zachowuje parę filmów i umożliwia ponowienie.

## Weryfikacja zmiany

Zakres kontroli: ukrycie roku w API i widoku, trafienie, błąd, ten sam rok,
przeniesienie filmu, wyczerpanie katalogu, wznowienie i odrzucenie starej sesji,
oddzielny rekord, teksty PL/EN oraz układ desktop/mobile.

Wyniki testów i kontroli przeglądarkowej należy podawać dopiero po ich wykonaniu.
Wcześniejsze wyniki dotyczące porównywania czasu trwania nie potwierdzają
poprawności wersji opartej na latach premier.

## Możliwe dalsze etapy

Przychód kinowy wymaga sprawdzonych danych o światowych wpływach i jawnych
jednostek. Codzienne wyzwanie, pojedynek albo ranking wymagają utrwalonej
kolejności par oraz trwałego zapisu odpowiedzi. Nie są częścią obecnego trybu.
