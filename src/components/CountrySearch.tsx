"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Country } from "@/types/country";
import { useDebounce } from "@/hooks/useDebounce";
import { CountryCard } from "@/components/CountryCard";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

export function CountrySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // Single explicit ref to prevent selection from triggering another search
  const isSelectionRef = useRef(false);

  // Stale request & race condition protection
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Ensure active option is kept in view during keyboard navigation
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current && results[activeIndex]) {
      const activeOptionId = `option-${results[activeIndex].cca2}`;
      const activeElement = listboxRef.current.querySelector(
        `#${activeOptionId}`
      );
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, results]);

  // Main search effect triggered by debounced query
  useEffect(() => {
    // 1. If this query update was caused by country selection, skip the API call
    if (isSelectionRef.current) {
      isSelectionRef.current = false;
      return;
    }

    const trimmedQuery = debouncedQuery.trim();

    // 2. Abort any currently in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 3. Minimum query length check
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return;
    }

    // 4. Setup request tracking and AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    const fetchCountries = async () => {
      setIsLoading(true);
      setError(null);
      setIsOpen(true);
      setActiveIndex(-1);

      try {
        const safeQuery = encodeURIComponent(trimmedQuery);
        const url = `/api/countries?q=${safeQuery}`;

        const response = await fetch(url, { signal: controller.signal });

        // If a newer request was dispatched while this was resolving, ignore result
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data: { results?: Country[]; error?: string } =
          await response.json();

        // Guard against race conditions after parsing json
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (data.error) {
          setError(data.error);
          setResults([]);
        } else {
          setResults(data.results ?? []);
        }

        setIsOpen(true);
        setIsLoading(false);
      } catch (err: unknown) {
        // Abort errors must not be treated as user-facing errors
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        // Ignore errors from superseded requests
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setError("Something went wrong while searching. Please try again.");
        setResults([]);
        setIsOpen(true);
        setIsLoading(false);
      }
    };

    fetchCountries();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const handleSelect = useCallback((country: Country) => {
    isSelectionRef.current = true;
    setSelectedCountry(country);
    setQuery(country.name.common);
    setIsOpen(false);
    setActiveIndex(-1);
    setError(null);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      setIsOpen(false);
      setActiveIndex(-1);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }

    // If user modifies input after selecting, return to search mode
    if (selectedCountry) {
      setSelectedCountry(null);
    }
  };

  const handleClear = () => {
    // Abort pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setQuery("");
    setResults([]);
    setError(null);
    setSelectedCountry(null);
    setActiveIndex(-1);
    setIsOpen(false);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "ArrowDown" && results.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        // Clamping at the bottom of the list (no wrap-around)
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        // Clamping at -1 (back to input, no option selected)
        setActiveIndex((prev) => Math.max(prev - 1, -1));
        break;
      }
      case "Enter": {
        if (activeIndex >= 0 && activeIndex < results.length) {
          e.preventDefault();
          handleSelect(results[activeIndex]);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      }
      default:
        break;
    }
  };

  const trimmedQuery = query.trim();
  const showEmptyState =
    isOpen &&
    !isLoading &&
    !error &&
    results.length === 0 &&
    trimmedQuery.length >= MIN_QUERY_LENGTH;

  const showDropdown = Boolean(
    isOpen && (isLoading || error || results.length > 0 || showEmptyState)
  );

  // aria-activedescendant must reference an existing DOM element only when dropdown is open and activeIndex >= 0
  const activeOptionId =
    showDropdown && activeIndex >= 0 && results[activeIndex]
      ? `option-${results[activeIndex].cca2}`
      : undefined;

  return (
    <div ref={containerRef} className="w-full max-w-lg">
      <div className="relative">
        <label htmlFor="country-search-input" className="sr-only">
          Search countries
        </label>

        <div className="relative flex items-center">
          {/* Search Icon */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 text-zinc-400 dark:text-zinc-500"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>

          <input
            ref={inputRef}
            id="country-search-input"
            type="text"
            role="combobox"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (
                trimmedQuery.length >= MIN_QUERY_LENGTH &&
                (results.length > 0 || error || showEmptyState)
              ) {
                setIsOpen(true);
              }
            }}
            placeholder="Search countries..."
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-controls={showDropdown ? "country-search-listbox" : undefined}
            aria-activedescendant={activeOptionId}
            className="w-full rounded-xl border border-zinc-200 bg-white py-3.5 pl-11 pr-20 text-base text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-white/10"
          />

          {/* Right Action Area (Spinner & Clear Button) */}
          <div className="absolute right-3 flex items-center gap-1.5">
            {isLoading && (
              <span
                role="status"
                aria-label="Searching countries"
                className="flex items-center text-zinc-400 dark:text-zinc-500"
              >
                <svg
                  className="h-4 w-4 animate-spin text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </span>
            )}

            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus:outline-hidden focus:ring-2 focus:ring-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Suggestion Dropdown Panel */}
        {showDropdown && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            {isLoading && results.length === 0 && (
              <div
                role="status"
                className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500 dark:text-zinc-400"
              >
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Searching countries...</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="px-4 py-4 text-center text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </div>
            )}

            {showEmptyState && (
              <div
                role="status"
                className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
              >
                No countries found for &apos;{trimmedQuery}&apos;
              </div>
            )}

            {results.length > 0 && (
              <ul
                ref={listboxRef}
                id="country-search-listbox"
                role="listbox"
                aria-label="Countries"
                className="max-h-72 overflow-y-auto divide-y divide-zinc-100 py-1 dark:divide-zinc-800/60"
              >
                {results.map((country, index) => {
                  const isHighlighted = activeIndex === index;
                  const optionId = `option-${country.cca2}`;
                  const capitalDisplay =
                    country.capital && country.capital.length > 0
                      ? country.capital.join(", ")
                      : "N/A";

                  return (
                    <li
                      key={country.cca2}
                      id={optionId}
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseDown={(e) => {
                        // Prevent input blur before click handler fires
                        e.preventDefault();
                      }}
                      onClick={() => handleSelect(country)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                        isHighlighted
                          ? "bg-zinc-100 dark:bg-zinc-800"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      {/* Country Flag */}
                      <div className="relative h-6 w-9 shrink-0 overflow-hidden rounded-xs border border-zinc-200/80 bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={country.flags.svg || country.flags.png}
                          alt={
                            country.flags.alt || `Flag of ${country.name.common}`
                          }
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Country Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                            {country.name.common}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                            {country.cca2}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="truncate">
                            Capital: {capitalDisplay}
                          </span>
                          <span>•</span>
                          <span className="shrink-0">{country.region}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Keyboard navigation helper */}
      <p
        aria-hidden="true"
        className="mt-2.5 hidden text-center text-xs text-zinc-400 sm:block dark:text-zinc-500"
      >
        ↑ ↓ Navigate • Enter Select • Esc Close
      </p>

      {/* Selected Country Detail Card */}
      {selectedCountry && <CountryCard country={selectedCountry} />}
    </div>
  );
}
