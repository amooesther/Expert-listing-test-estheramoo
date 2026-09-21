import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { CountrySearch } from "@/components/CountrySearch";
import type { Country } from "@/types/country";

const mockCanada: Country = {
  cca2: "CA",
  name: { common: "Canada", official: "Canada" },
  flags: {
    png: "https://flagcdn.com/w320/ca.png",
    svg: "https://flagcdn.com/ca.svg",
    alt: "Flag of Canada",
  },
  capital: ["Ottawa"],
  region: "Americas",
};

const mockCameroon: Country = {
  cca2: "CM",
  name: { common: "Cameroon", official: "Republic of Cameroon" },
  flags: {
    png: "https://flagcdn.com/w320/cm.png",
    svg: "https://flagcdn.com/cm.svg",
    alt: "Flag of Cameroon",
  },
  capital: ["Yaoundé"],
  region: "Africa",
};

const mockGermany: Country = {
  cca2: "DE",
  name: { common: "Germany", official: "Federal Republic of Germany" },
  flags: {
    png: "https://flagcdn.com/w320/de.png",
    svg: "https://flagcdn.com/de.svg",
    alt: "Flag of Germany",
  },
  capital: ["Berlin"],
  region: "Europe",
};

const mockFrance: Country = {
  cca2: "FR",
  name: { common: "France", official: "French Republic" },
  flags: {
    png: "https://flagcdn.com/w320/fr.png",
    svg: "https://flagcdn.com/fr.svg",
    alt: "Flag of France",
  },
  capital: ["Paris"],
  region: "Europe",
};

describe("CountrySearch Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("1. does not make an API request before minimum query length of 2 characters", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<CountrySearch />);

    const input = screen.getByRole("combobox", { name: /search countries/i });

    // Single character
    fireEvent.change(input, { target: { value: "c" } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    // Spaces only
    fireEvent.change(input, { target: { value: "  " } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("2. implements debounced search (waits ~350ms and cancels pending keystrokes)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockCanada],
      json: async () => ({ results: [mockCanada] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    // Simulate rapid keystrokes within debounce window
    fireEvent.change(input, { target: { value: "c" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    fireEvent.change(input, { target: { value: "ca" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    fireEvent.change(input, { target: { value: "can" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Still within debounce window from the last change
    expect(fetchSpy).not.toHaveBeenCalled();

    // Now advance past the 350ms debounce threshold
    await act(async () => {
      vi.advanceTimersByTime(160);
    });

    // Only one fetch call made with the final debounced query
    // Only one fetch call made with the final debounced query to /api/countries
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("name/can"),
      "/api/countries?q=can",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("3. displays successful search results with flag, name, capital, and region", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockCanada, mockCameroon],
      json: async () => ({ results: [mockCanada, mockCameroon] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "ca" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const listbox = screen.getByRole("listbox", { name: /countries/i });
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);

    // Verify first country details
    expect(within(options[0]).getByText("Canada")).toBeInTheDocument();
    expect(within(options[0]).getByText(/Ottawa/)).toBeInTheDocument();
    expect(within(options[0]).getByText("Americas")).toBeInTheDocument();
    expect(within(options[0]).getByAltText("Flag of Canada")).toBeInTheDocument();

    // Verify second country details
    expect(within(options[1]).getByText("Cameroon")).toBeInTheDocument();
    expect(within(options[1]).getByText(/Yaoundé/)).toBeInTheDocument();
    expect(within(options[1]).getByText("Africa")).toBeInTheDocument();
  });

  it("4. displays loading state during an in-flight search without layout shifts", async () => {
    let resolvePromise: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(global, "fetch").mockReturnValue(fetchPromise);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "ca" } });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Loading status indicators should be active
    const loadingStatus = screen.getAllByRole("status");
    expect(loadingStatus.length).toBeGreaterThan(0);
    expect(screen.getByText("Searching countries...")).toBeInTheDocument();

    // Resolve response
    await act(async () => {
      resolvePromise!({
        ok: true,
        status: 200,
        json: async () => [mockCanada],
        json: async () => ({ results: [mockCanada] }),
      } as Response);
    });

    expect(screen.queryByText("Searching countries...")).not.toBeInTheDocument();
    expect(screen.getByText("Canada")).toBeInTheDocument();
  });

  it("5. translates 404 API responses into empty state: No countries found for '[query]'", async () => {
  it("5. renders empty state for unmatched queries: No countries found for '[query]'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ status: 404, message: "Not Found" }),
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "xyzqwe" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(
      screen.getByText("No countries found for 'xyzqwe'")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Something went wrong/)
    ).not.toBeInTheDocument();
  });

  it("6. displays graceful error state on network or server API failure", async () => {
  it("6. displays graceful error state on server API failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Internal Server Error" }),
      status: 502,
      json: async () => ({ error: "Unable to search countries right now." }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "error" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const errorAlert = screen.getByRole("alert");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent(
      "Something went wrong while searching. Please try again."
    );
    expect(errorAlert).not.toHaveTextContent("500");
    expect(errorAlert).not.toHaveTextContent("502");
  });

  it("7. handles ArrowDown keyboard navigation with clamping at the list bottom", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockCanada, mockCameroon],
      json: async () => ({ results: [mockCanada, mockCameroon] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });
    input.focus();

    fireEvent.change(input, { target: { value: "ca" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "false");

    // First ArrowDown -> selects first item
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", "option-CA");

    // Second ArrowDown -> selects second item
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", "option-CM");

    // Third ArrowDown -> clamped at the last item (does NOT wrap)
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", "option-CM");

    // DOM focus remains on input
    expect(document.activeElement).toBe(input);
  });

  it("8. handles ArrowUp keyboard navigation with clamping at index -1", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockCanada, mockCameroon],
      json: async () => ({ results: [mockCanada, mockCameroon] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "ca" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const options = screen.getAllByRole("option");

    // Navigate down to item 1
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    // ArrowUp -> back to item 0
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", "option-CA");

    // ArrowUp again -> back to index -1 (unhighlighted, input active)
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");

    // ArrowUp once more -> clamps at -1
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("9. selects highlighted result on Enter key without triggering an unnecessary search", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockCanada, mockCameroon],
      json: async () => ({ results: [mockCanada, mockCameroon] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "ca" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Highlight first item (Canada)
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // Press Enter to select
    fireEvent.keyDown(input, { key: "Enter" });

    // Input populated with common name
    expect(input).toHaveValue("Canada");

    // Dropdown closed
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    // Selected country detail card displayed
    const detailCard = screen.getByRole("article", {
      name: /selected country: canada/i,
    });
    expect(detailCard).toBeInTheDocument();
    expect(within(detailCard).getByText("Ottawa")).toBeInTheDocument();
    expect(within(detailCard).getByText("Americas")).toBeInTheDocument();

    // Crucial check: selection must not trigger another search!
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("10. closes suggestion dropdown on Escape key", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockCanada],
      json: async () => ({ results: [mockCanada] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "ca" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("11. supports mouse selection of an option", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockCanada, mockCameroon],
      json: async () => ({ results: [mockCanada, mockCameroon] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "ca" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const options = screen.getAllByRole("option");
    fireEvent.click(options[1]); // Click Cameroon

    expect(input).toHaveValue("Cameroon");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    const detailCard = screen.getByRole("article", {
      name: /selected country: cameroon/i,
    });
    expect(detailCard).toBeInTheDocument();
    expect(within(detailCard).getByText("Yaoundé")).toBeInTheDocument();
    expect(within(detailCard).getByText("Africa")).toBeInTheDocument();
  });

  it("12. clears query, results, error, selection, and cancels obsolete requests on clear", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [mockCanada],
      json: async () => ({ results: [mockCanada] }),
    } as Response);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "can" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Select Canada
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("article")).toBeInTheDocument();

    // Click clear button
    const clearButton = screen.getByRole("button", { name: /clear search/i });
    fireEvent.click(clearButton);

    expect(input).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Verify input retains focus
    expect(document.activeElement).toBe(input);

    // Verify no search is scheduled after clearing
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("13. protects against stale/out-of-order responses overwriting newer search results", async () => {
    let resolveFirstRequest: (value: Response) => void;
    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirstRequest = resolve;
    });

    let resolveSecondRequest: (value: Response) => void;
    const secondPromise = new Promise<Response>((resolve) => {
      resolveSecondRequest = resolve;
    });

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    // First query: "fr"
    fireEvent.change(input, { target: { value: "fr" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second query: "de"
    fireEvent.change(input, { target: { value: "de" } });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Second request resolves fast with Germany
    await act(async () => {
      resolveSecondRequest!({
        ok: true,
        status: 200,
        json: async () => [mockGermany],
        json: async () => ({ results: [mockGermany] }),
      } as Response);
    });

    expect(screen.getByText("Germany")).toBeInTheDocument();

    // Slower, older first request resolves later with France
    await act(async () => {
      resolveFirstRequest!({
        ok: true,
        status: 200,
        json: async () => [mockFrance],
        json: async () => ({ results: [mockFrance] }),
      } as Response);
    });

    // Germany must remain; France must NOT overwrite Germany!
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.queryByText("France")).not.toBeInTheDocument();
  });

  it("14. silently handles aborted requests without displaying an error", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new DOMException("The user aborted a request.", "AbortError"));
          }, 100);
        })
    );

    render(<CountrySearch />);
    const input = screen.getByRole("combobox", { name: /search countries/i });

    fireEvent.change(input, { target: { value: "ca" } });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Advance to trigger the mock AbortError rejection
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    // No error banner should be displayed to the user
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Something went wrong while searching/)
    ).not.toBeInTheDocument();
  });
});
