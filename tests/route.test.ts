import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/countries/route";
import type { Country } from "@/types/country";

const mockGhana: Country = {
  cca2: "GH",
  name: { common: "Ghana", official: "Republic of Ghana" },
  flags: {
    png: "https://flagcdn.com/w320/gh.png",
    svg: "https://flagcdn.com/gh.svg",
    alt: "Flag of Ghana",
  },
  capital: ["Accra"],
  region: "Africa",
};

describe("GET /api/countries Route Handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty results without calling upstream when query is empty or shorter than 2 characters", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    // Case 1: single character
    const req1 = new NextRequest("http://localhost:3000/api/countries?q=g");
    const res1 = await GET(req1);
    const data1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(data1).toEqual({ results: [] });

    // Case 2: spaces only
    const req2 = new NextRequest("http://localhost:3000/api/countries?q=  ");
    const res2 = await GET(req2);
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2).toEqual({ results: [] });

    // Case 3: missing query param
    const req3 = new NextRequest("http://localhost:3000/api/countries");
    const res3 = await GET(req3);
    const data3 = await res3.json();
    expect(res3.status).toBe(200);
    expect(data3).toEqual({ results: [] });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies request to REST Countries and returns { results } on success", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockGhana],
    } as Response);

    const req = new NextRequest("http://localhost:3000/api/countries?q=ghana");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ results: [mockGhana] });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://restcountries.com/v3.1/name/ghana?fields=name,flags,capital,cca2,region",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      })
    );
  });

  it("translates upstream HTTP 404 into an empty result array { results: [] }", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "Not Found" }),
    } as Response);

    const req = new NextRequest("http://localhost:3000/api/countries?q=xyzqwe");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ results: [] });
  });

  it("handles upstream 500 as an upstream failure with sanitized error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Internal Server Error" }),
    } as Response);

    const req = new NextRequest("http://localhost:3000/api/countries?q=failure");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data).toEqual({ error: "Unable to search countries right now." });
  });

  it("handles network exceptions gracefully with sanitized error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network disconnect"));

    const req = new NextRequest("http://localhost:3000/api/countries?q=timeout");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toEqual({ error: "Unable to search countries right now." });
  });
});

