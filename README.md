# Country Typeahead Search

## Overview

A typeahead/autocomplete search application built with Next.js App Router, React 19, TypeScript, and Tailwind CSS. The application queries the REST Countries API as the user types, demonstrating resilient asynchronous state management, debouncing, race condition protection, accessible combobox semantics, and clamped keyboard navigation without third-party autocomplete libraries.

## Features

* **Debounced Search**: Keystrokes debounced at 350ms to minimize network traffic.
* **Stale-Request Cancellation**: In-flight requests cancelled via `AbortController` and guarded by monotonic request IDs.
* **Clamped Keyboard Navigation**: Predictable `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` navigation without wrapping.
* **Accessible Combobox**: WAI-ARIA combobox pattern keeping DOM focus on the input via `aria-activedescendant`.
* **Resilient States**: Loading, empty (translating HTTP 404), and error states without layout shift.
* **Responsive Interface**: Polished mobile and desktop layout with clear contrast.
* **Strict TypeScript**: Strict types matching required API fields without `any`.
* **Automated Tests**: 14 behavioral integration tests in Vitest and React Testing Library.

## Tech Stack

* Next.js 16 (App Router)
* React 19
* TypeScript 5
* Tailwind CSS 4
* Vitest 5 & React Testing Library

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To build and run in production:
```bash
npm run build
npm run start
```

## Testing

```bash
npm test         # Run test suite
npm run lint     # Run ESLint
```

## Architecture

The project avoids global state or ready-made autocomplete packages:

```text
src/
├── app/
│   ├── globals.css         # Styling and system font stack
│   ├── layout.tsx          # HTML shell and metadata
│   └── page.tsx            # Centered search view layout
├── components/
│   ├── CountryCard.tsx     # Selected country detail card
│   └── CountrySearch.tsx   # Combobox input, listbox, and state orchestration
├── hooks/
│   └── useDebounce.ts      # Reusable debounce hook with cleanup
└── types/
    └── country.ts          # Country interface
tests/
└── CountrySearch.test.tsx  # Behavioral test suite
```

## Key Engineering Decisions

### Debouncing
A 350ms debounce balances responsiveness with network efficiency. Pending timers are cleaned up immediately when the query changes or the component unmounts.

### Race Conditions & Abort Handling
Fast typing can resolve responses out of order. We use `AbortController` to abort in-flight requests and a monotonic request counter (`requestIdRef`) to ensure older responses never overwrite newer state. `AbortError` rejections are caught silently.

### Accessibility (Virtual Focus Pattern)
DOM focus remains strictly on the `<input>` element. As the user navigates, `aria-activedescendant` points to the highlighted option's ID, and active elements scroll into view. When closed, `aria-activedescendant` is safely set to `undefined`.

### Clamped Keyboard Navigation
`ArrowDown` and `ArrowUp` clamp at the boundaries (`0` and `results.length - 1`, and `-1` for unselected) rather than cycling back around, avoiding accidental loop selections.

### Minimum Query Length & 404 Handling
Searching starts at 2 trimmed characters to prevent broad, low-utility queries. The REST Countries API returns HTTP 404 when no records match; we deliberately map 404 to an empty array so users see `"No countries found for '[query]'"` instead of a false error.

### Selection Handling
A single `isSelectionRef` tracks item selection. Selecting a country updates the input and closes suggestions without triggering a redundant search. Typing again resets selection and resumes search mode.

### API Choice
REST Countries is suitable for a frontend demonstration, but a high-traffic production system would query a dedicated search service (e.g., Elasticsearch, Algolia, or a Postgres trigram index) behind a backend API proxy to ensure low latency and strict rate limiting.

## Production Considerations

* **Server-Side API Proxy / BFF**: Route requests through an internal endpoint to hide third-party latency and protect rate limits.
* **Edge Caching**: Cache common query prefixes on CDN edge nodes with `stale-while-revalidate`.
* **Request Deduplication**: Memoize identical queries client-side to prevent redundant round-trips.
* **Observability**: Track query latency, failure rates, and zero-result queries via APM (Datadog/Sentry).
* **Retry Strategy**: Implement exponential backoff on transient network failures.

## Testing Strategy

Tests in `tests/CountrySearch.test.tsx` verify end-to-end user behaviors:
* Debounce timer collapsing and obsolete request cancellation.
* Slower out-of-order responses resolving after faster responses.
* Silent handling of `AbortError`.
* Clamped keyboard navigation and ARIA attribute synchronization.
* Graceful rendering of loading, empty (404), and error states.

## Tradeoffs

We avoided heavyweight state libraries and headless UI wrappers (Downshift, Radix) because localized React state keeps the bundle lightweight, dependencies lean, and core engineering decisions fully visible for review.

## Screening Task Write-up

This implementation balances engineering rigor with lean architecture. I opted against third-party combobox libraries and global state managers, keeping all state localized within a single custom combobox component and a reusable `useDebounce` hook. This keeps bundle overhead minimal and makes accessibility and lifecycle handling straightforward to review. A specific design choice was adopting the ARIA virtual focus model with clamped navigation: DOM focus remains on the input while `aria-activedescendant` tracks selection, eliminating DOM focus thrashing.

For high-traffic production use, this architecture would sit behind a server-side BFF proxy. The proxy would normalize country payloads, apply token-bucket rate limiting, and serve query prefixes from an edge cache using `stale-while-revalidate`. Query deduplication and client-side LRU caching (or a lightweight TanStack Query integration) would eliminate repeated network roundtrips for frequent keystroke deletions and re-types.

Testing is centered on integration behavior using Vitest and React Testing Library with simulated fake timers and mock responses. Rather than checking internal hook values, tests exercise real user journeys: verifying debounce cancellation under rapid typing, ensuring aborted requests do not leak errors, and confirming that older asynchronous resolutions cannot overwrite newer queries. Edge conditions—specifically REST Countries returning HTTP 404 for unmatched queries—are tested to ensure they cleanly render informative empty states instead of generic network failures.
