export type GeocodeResult = {
  name: string;
  admin1?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
};

const VWORLD_SEARCH_URL = "https://api.vworld.kr/req/search";

/** Matches Hangul syllables/jamo — used to detect a Korean-language query so
 * we can route it to VWorld's address search instead of Open-Meteo's
 * place-name gazetteer, which doesn't index Korean street addresses. */
function containsHangul(text: string): boolean {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(text);
}

/**
 * Searches South Korea's address/place database via VWorld's Search API
 * (도로명/지번 주소 + 장소명). Requires VWORLD_API_KEY / VWORLD_DOMAIN — falls
 * back silently (empty list) if the key is missing or the request fails, so
 * callers can safely fall through to another source.
 */
async function searchKoreaAddress(query: string): Promise<GeocodeResult[]> {
  const apiKey = process.env.VWORLD_API_KEY;
  if (!apiKey) return [];
  const domain = process.env.VWORLD_DOMAIN ?? "https://flydronemap.com";

  const url = new URL(VWORLD_SEARCH_URL);
  url.searchParams.set("service", "search");
  url.searchParams.set("request", "search");
  url.searchParams.set("version", "2.0");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("size", "5");
  url.searchParams.set("page", "1");
  url.searchParams.set("query", query);
  url.searchParams.set("type", "address");
  url.searchParams.set("category", "road");
  url.searchParams.set("format", "json");
  url.searchParams.set("errorFormat", "json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("domain", domain);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      response?: {
        status?: string;
        result?: {
          items?: Array<{
            title?: string;
            address?: { road?: string; parcel?: string };
            point?: { x?: string; y?: string };
          }>;
        };
      };
    };

    if (data.response?.status !== "OK") return [];

    const items = data.response.result?.items ?? [];
    const results: GeocodeResult[] = [];
    for (const item of items) {
      const lon = Number(item.point?.x);
      const lat = Number(item.point?.y);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      results.push({
        name:
          item.title ||
          item.address?.road ||
          item.address?.parcel ||
          query,
        admin1: item.address?.road || item.address?.parcel,
        country: "대한민국",
        countryCode: "KR",
        latitude: lat,
        longitude: lon,
      });
    }
    return results;
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
