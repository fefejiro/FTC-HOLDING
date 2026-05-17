import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type MapboxFeature = {
  place_name?: string;
  text?: string;
  center?: [number, number];
  context?: Array<{ id?: string; text?: string }>;
  properties?: Record<string, unknown>;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractContextText(feature: MapboxFeature, prefix: string): string {
  const ctx = Array.isArray(feature.context) ? feature.context : [];
  const match = ctx.find((item) => String(item?.id || "").startsWith(prefix));
  return toText(match?.text);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = toText(searchParams.get("q"));

  if (query.length < 3) {
    return NextResponse.json({ ok: true, configured: true, provider: "mapbox", suggestions: [] });
  }

  const provider = toText(process.env.GARDEN_ADDRESS_AUTOCOMPLETE_PROVIDER || "mapbox").toLowerCase();
  const mapboxToken = toText(process.env.GARDEN_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_GARDEN_MAPBOX_TOKEN);

  if (provider !== "mapbox" || !mapboxToken) {
    return NextResponse.json({
      ok: true,
      configured: false,
      provider: provider || null,
      suggestions: [],
      reason: "Address autocomplete provider is not configured. Manual address entry is still available."
    });
  }

  try {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
    url.searchParams.set("access_token", mapboxToken);
    url.searchParams.set("autocomplete", "true");
    url.searchParams.set("limit", "6");
    url.searchParams.set("country", "ca");
    url.searchParams.set("types", "address,place,postcode,neighborhood,locality");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "GardenCleanersAddressAutocomplete/1.0"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, configured: true, provider: "mapbox", suggestions: [] }, { status: 502 });
    }

    const body = (await response.json()) as { features?: MapboxFeature[] };
    const features = Array.isArray(body.features) ? body.features : [];

    const suggestions = features.map((feature, index) => {
      const city = extractContextText(feature, "place") || extractContextText(feature, "locality");
      const region = extractContextText(feature, "region");
      const postalCode = extractContextText(feature, "postcode");
      const center = Array.isArray(feature.center) ? feature.center : [];
      const longitude = Number(center[0]);
      const latitude = Number(center[1]);

      return {
        id: `${index}-${toText(feature.place_name || feature.text || "address")}`,
        label: toText(feature.place_name || feature.text || "Address"),
        address: toText(feature.text || feature.place_name || ""),
        city,
        region,
        postalCode,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null
      };
    });

    return NextResponse.json({ ok: true, configured: true, provider: "mapbox", suggestions });
  } catch {
    return NextResponse.json({ ok: true, configured: true, provider: "mapbox", suggestions: [] });
  }
}
