import { NextRequest, NextResponse } from "next/server";
import type { Country } from "@/types/country";
import fallbackCountries from "@/data/countries.json";

const MIN_QUERY_LENGTH = 2;
const FIELDS = "name,flags,capital,cca2,region";

export interface CountriesApiResponse {
  results?: Country[];
  error?: string;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<CountriesApiResponse>> {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const trimmedQuery = query.trim();

  // 1. Return empty results if query is below minimum character threshold
  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  try {
    const safeQuery = encodeURIComponent(trimmedQuery);
    const upstreamUrl = `https://restcountries.com/v3.1/name/${safeQuery}?fields=${FIELDS}`;

    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    // 2. Treat REST Countries 404 as valid empty result set
    if (upstreamResponse.status === 404) {
      return NextResponse.json({ results: [] });
    }

    // 3. Handle upstream non-2xx status
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "Unable to search countries right now." },
        { status: 502 }
      );
    }

    const data: unknown = await upstreamResponse.json();

    // 4. Handle valid array response from REST Countries
    if (Array.isArray(data)) {
      return NextResponse.json({ results: data as Country[] });
    }

    // 5. Fallback if upstream returns a non-array response (e.g. deprecated endpoint response)
    const lowerQuery = trimmedQuery.toLowerCase();
    const matched = (fallbackCountries as Country[]).filter(
      (c) =>
        c.name.common.toLowerCase().includes(lowerQuery) ||
        (c.name.official && c.name.official.toLowerCase().includes(lowerQuery))
    );

    return NextResponse.json({ results: matched });
  } catch {
    // 6. Sanitize unexpected network or system failures
    return NextResponse.json(
      { error: "Unable to search countries right now." },
      { status: 500 }
    );
  }
}

