export type GeocodeResult = {
  name: string;
  admin1?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
};

const GOOGLE_PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

/** Matches Hangul syllables/jamo — used to detect a Korean-language query so
 * we can route it to Google's Korea-scoped address search instead of
 * Open-Meteo's place-name gazetteer, which doesn't index Korean street
 * addresses. */
function containsHangul(text: string): boolean {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(text);
}

/**
 * Searches South Korea's address/place database via Google's Places API
 * (Text Search, regionCode=KR). Requires GOOGLE_PLACES_API_KEY — falls back
 * silently (empty list) if the key is missing or the request fails, so
 * callers can safely fall through to another source.
 *
 * Replaced VWorld's address search here on 2026-09-02: VWorld blocks
 * requests from Vercel's server IP ranges (the same restriction that made
 * the airspace-layer overlay fail server-side — see
 * src/lib/airspace-layers.ts's header comment), so this call always failed
 * silently in production. Google's Places API has no such restriction; it's
 * a commercial API meant to be called from any server. The field mask below
 * is kept minimal so requests stay on Google's cheaper "Text Search
 * Essentials" pricing tier (10,000 free requests/month) rather than
 * Pro/Enterprise.
 */
async function searchKoreaAddress(query: string): Promise<GeocodeResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(GOOGLE_PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "ko",
        regionCode: "KR",
      }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      places?: Array<{
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
      }>;
    };

    const places = data.places ?? [];
    const results: GeocodeResult[] = [];
    for (const place of places) {
      const lat = place.location?.latitude;
      const lon = place.location?.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") continue;
      results.push({
        name: place.displayName?.text || place.formattedAddress || query,
        admin1: place.formattedAddress,
        country: "대한민국",
        countryCode: "KR",
        latitude: lat,
        longitude: lon,
      });
    }
    return results.slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Open-Meteo's free geocoding API. No API key required.
 * https://open-meteo.com/en/docs/geocoding-api
 *
 * Good for global place names, but doesn't handle Korean-language street
 * addresses well (it's a place-name gazetteer, not an address geocoder, and
 * only supports a fixed set of "language" codes for display, not input
 * matching). For Korean-script queries we try VWorld's address search first.
 */
async function searchGlobalPlaces(query: string): Promise<GeocodeResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: Array<{
      name: string;
      admin1?: string;
      country?: string;
      country_code?: string;
      latitude: number;
      longitude: number;
    }>;
  };

  return (data.results ?? []).map((r) => ({
    name: r.name,
    admin1: r.admin1,
    country: r.country ?? "",
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (containsHangul(trimmed)) {
    const korean = await searchKoreaAddress(trimmed);
    if (korean.length > 0) return korean;
    // Fall through to the global gazetteer as a last resort (e.g. a Korean
    // spelling of a foreign place name), even though it rarely matches.
  }

  return searchGlobalPlaces(trimmed);
}
