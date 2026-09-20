// TMDB supplies availability, but not individual platform title URLs.
// Official platform homepages are preferable to guessing unsupported deep links.
const PROVIDER_SITES: [RegExp, string][] = [
  [/amazon|prime video/, "https://www.primevideo.com/"],
  [/apple tv|itunes/, "https://tv.apple.com/pl"],
  [/netflix/, "https://www.netflix.com/pl/"],
  [/disney/, "https://www.disneyplus.com/pl-pl"],
  [/^(hbo\s*)?max$|^hbo go$/, "https://www.hbomax.com/"],
  [/skyshowtime/, "https://www.skyshowtime.com/pl"],
  [/canal\s*\+/, "https://www.canalplus.com/pl/"],
  [/^player$/, "https://player.pl/"],
  [/rakuten/, "https://www.rakuten.tv/pl"],
  [/^mubi$/, "https://mubi.com/"],
  [/^cda/, "https://www.cda.pl/premium"],
  [/tvp/, "https://vod.tvp.pl/"],
  [/polsat/, "https://polsatboxgo.pl/"],
  [/google play/, "https://play.google.com/store/movies"],
  [/youtube/, "https://www.youtube.com/feed/storefront"],
  [/^chili$/, "https://www.chili.com/"],
  [/^plex/, "https://watch.plex.tv/"],
];

export function getWatchProviderUrl(providerName: string, fallbackUrl: string): string {
  const name = providerName.trim().toLowerCase();
  return PROVIDER_SITES.find(([pattern]) => pattern.test(name))?.[1] ?? fallbackUrl;
}
