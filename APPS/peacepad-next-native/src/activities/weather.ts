import type { ActivityWeather } from "./ActivitySuggestions";

export type WeatherSnapshot = Readonly<{
  condition: ActivityWeather;
  temperatureC: number;
  weatherCode: number;
}>;

export type WeatherPlace = Readonly<{
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
}>;

type WeatherFetch = (input: string, init?: { signal?: AbortSignal }) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const CLOUD_CODES = new Set([1, 2, 3, 45, 48]);

/**
 * Keeps the established web-product Open-Meteo mapping in one deterministic
 * function so weather filters behave the same on iOS, Android, and web.
 * Temperature bands intentionally override the general sky condition, as in
 * the legacy experience.
 */
export function classifyOpenMeteoWeather(temperatureC: number, weatherCode: number): ActivityWeather {
  if (!Number.isFinite(temperatureC) || !Number.isFinite(weatherCode)) {
    throw new Error("Weather response was invalid.");
  }
  let condition: ActivityWeather = "sunny";
  if (RAIN_CODES.has(weatherCode)) condition = "rainy";
  else if (SNOW_CODES.has(weatherCode)) condition = "snowy";
  else if (CLOUD_CODES.has(weatherCode)) condition = "cloudy";
  if (temperatureC > 28) return "hot";
  if (temperatureC < 5) return "cold";
  return condition;
}

function assertCoordinates(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Enter a valid place before checking weather.");
  }
}

/** Fetches only the current weather fields needed by the activity catalogue. */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
  fetchImpl: WeatherFetch = fetch
): Promise<WeatherSnapshot> {
  assertCoordinates(latitude, longitude);
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code"
  });
  const response = await fetchImpl(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error("Weather is temporarily unavailable.");
  const body = await response.json() as { current?: { temperature_2m?: unknown; weather_code?: unknown } };
  const temperatureC = body.current?.temperature_2m;
  const weatherCode = body.current?.weather_code;
  if (typeof temperatureC !== "number" || typeof weatherCode !== "number") {
    throw new Error("Weather response was invalid.");
  }
  return { condition: classifyOpenMeteoWeather(temperatureC, weatherCode), temperatureC, weatherCode };
}

/** Resolves a typed place without requesting device location permission. */
export async function findWeatherPlace(place: string, fetchImpl: WeatherFetch = fetch): Promise<WeatherPlace> {
  const query = place.trim();
  if (query.length < 2) throw new Error("Enter a city or region first.");
  const params = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" });
  const response = await fetchImpl(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) throw new Error("Place search is temporarily unavailable.");
  const body = await response.json() as { results?: Array<{ name?: unknown; country?: unknown; latitude?: unknown; longitude?: unknown }> };
  const result = body.results?.[0];
  if (!result || typeof result.name !== "string" || typeof result.latitude !== "number" || typeof result.longitude !== "number") {
    throw new Error("No matching place was found.");
  }
  assertCoordinates(result.latitude, result.longitude);
  return {
    name: result.name,
    country: typeof result.country === "string" ? result.country : undefined,
    latitude: result.latitude,
    longitude: result.longitude
  };
}
