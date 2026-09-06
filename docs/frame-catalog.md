# Stała baza kadrów

Trening i pojedynek korzystają z tego samego, wersjonowanego katalogu `src/data/frame-catalog.json`. Tworzenie gry i rewanżu **nie pobiera listy popularnych filmów z TMDB**. Bieżąca gra zapisuje w pokoju cały zestaw pytań, więc aktualizacja katalogu nie zmienia rozpoczętych rozgrywek.

Pierwszy import bazuje na 988 identyfikatorach z istniejącego `eligible-movies.json`, rozszerzonych o komedie obyczajowe. Katalog zawiera tytuły PL/EN, rok, gatunki, słowa kluczowe, obsadę, reżyserów, język, serię oraz do trzech stałych ścieżek zdjęć na film. Nie zmienia bazy zagadek „Filmu dnia”. JSON jest bazą treści w repozytorium; pokoje i wyniki nadal zapisują się w PostgreSQL. Zdjęcia są ładowane z CDN TMDB — pliki graficzne nie są hostowane lokalnie.

## Rozbudowa

Klucz `TMDB_API_KEY` musi być ustawiony w środowisku lub lokalnym `.env`. Nie zapisujemy go w katalogu.

```sh
# Dodaj konkretne, wcześniej sprawdzone identyfikatory TMDB:
npm run catalog:sync -- --ids=123,456

# Uzupełnij brakujące filmy z istniejącej listy eligible-movies.json:
npm run catalog:sync

# Świadomie odśwież metadane wybranych filmów:
npm run catalog:sync -- --ids=123,456 --refresh
```

Importer jest przyrostowy: pomija istniejące wpisy bez `--refresh`, nie usuwa filmów przy błędzie sieci, ponawia nieudane żądania i podmienia wygenerowany plik atomowo. Uruchamiany ręcznie, nie podczas gry ani automatycznie przy buildzie. Import odrzuca treści dla dorosłych, dokumenty, filmy telewizyjne, niewydane tytuły i brak odpowiedniego kadru.

## Ręczna korekta i kontrola jakości

`src/data/frame-catalog-overrides.json` przechowuje korekty, których importer nie nadpisuje. Kluczem jest identyfikator TMDB filmu. Dostępne pola:

- `enabled: false` — wyłącz film z pytań i odpowiedzi;
- `frames: ["/sciezka.jpg"]` — zastąp zestaw kadrów ręcznie wybranymi ścieżkami TMDB;
- `titles: { "pl": "Tytuł" }` — popraw lokalizację;
- `relatedMovieIds: [123, 456]` — preferuj konkretne, podobne filmy jako błędne odpowiedzi. Nadal obowiązują filtry gatunkowe i rocznikowe.

Automatycznie wybierane zdjęcia mają minimum 1280 px, proporcje panoramiczne i brak oznaczonego języka. To **nie gwarantuje braku napisów ani tego, że każde zdjęcie jest kadrem ze sceny** — TMDB zawiera również materiały promocyjne. Nowe wpisy warto przejrzeć wizualnie; zbyt oczywiste, montażowe lub błędne zdjęcia zastąpić przez `frames`. Polskie tytuły bez tłumaczenia mają angielski fallback; można je skorygować w `titles`.

## Trudność odpowiedzi

Nie mieszamy animacji z filmami aktorskimi ani horroru, science fiction, wojny i westernu z filmami bez danego gatunku. Odpowiedzi muszą mieć wspólny gatunek i różnicę roczników do 20 lat. Ranking uwzględnia zestaw gatunków, bliskość roku, tematykę, obsadę, reżysera, język, serię i korekty redakcyjne. Wybierane są trzy spośród sześciu najlepszych dopasowań z niewielką losowością. Film z mniej niż trzema sensownymi alternatywami nie jest losowany jako pytanie; nie ma awaryjnego losowania przypadkowych filmów.

Przed publikacją uruchom `npm test`, `npm run lint` i `npm run build`. Testy kontrolują spójność katalogu i korekt, przykład „Prada vs Mario”, lokalizację oraz 200 przykładowych zestawów.

Źródło metadanych i ścieżek: [TMDB Movie Details](https://developer.themoviedb.org/reference/movie-details), [łączenie odpowiedzi API](https://developer.themoviedb.org/docs/append-to-response), [języki zdjęć](https://developer.themoviedb.org/docs/image-languages).
