import { classifyOpenMeteoWeather, fetchCurrentWeather, findWeatherPlace } from "./weather";

describe("legacy weather activity integration", () => {
  it("preserves the Open-Meteo condition mapping and temperature overrides", () => {
    expect(classifyOpenMeteoWeather(20, 0)).toBe("sunny");
    expect(classifyOpenMeteoWeather(20, 3)).toBe("cloudy");
    expect(classifyOpenMeteoWeather(20, 63)).toBe("rainy");
    expect(classifyOpenMeteoWeather(20, 73)).toBe("snowy");
    expect(classifyOpenMeteoWeather(30, 63)).toBe("hot");
    expect(classifyOpenMeteoWeather(4, 0)).toBe("cold");
  });

  it("fails closed for invalid temperatures and coordinates", async () => {
    expect(() => classifyOpenMeteoWeather(Number.NaN, 0)).toThrow("invalid");
    await expect(fetchCurrentWeather(91, 0, jest.fn())).rejects.toThrow("valid place");
  });

  it("requests only the current weather fields used by the catalogue", async () => {
    const fetchImpl = jest.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ current: { temperature_2m: 17, weather_code: 61 } })
    }));
    await expect(fetchCurrentWeather(43.9, -78.9, fetchImpl)).resolves.toMatchObject({ condition: "rainy", temperatureC: 17 });
    expect(fetchImpl.mock.calls[0][0]).toContain("current=temperature_2m%2Cweather_code");
  });

  it("resolves a typed place and rejects an empty search", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ results: [{ name: "Oshawa", country: "Canada", latitude: 43.9, longitude: -78.9 }] }) }));
    await expect(findWeatherPlace("Oshawa", fetchImpl)).resolves.toMatchObject({ name: "Oshawa", country: "Canada" });
    await expect(findWeatherPlace(" ", fetchImpl)).rejects.toThrow("city or region");
  });

  it("reports unavailable and malformed provider responses without inventing weather", async () => {
    await expect(fetchCurrentWeather(43, -79, jest.fn(async () => ({ ok: false, json: async () => ({}) })))).rejects.toThrow("temporarily unavailable");
    await expect(fetchCurrentWeather(43, -79, jest.fn(async () => ({ ok: true, json: async () => ({ current: {} }) })))).rejects.toThrow("invalid");
    await expect(findWeatherPlace("Oshawa", jest.fn(async () => ({ ok: true, json: async () => ({ results: [] }) })))).rejects.toThrow("No matching place");
  });
});
