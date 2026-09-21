# Country Typeahead Search

## Overview

A typeahead/autocomplete search application built with Next.js App Router, React 19, TypeScript, and Tailwind CSS. The application queries the REST Countries API as the user types, demonstrating resilient asynchronous state management, debouncing, race condition protection, accessible combobox semantics, and clamped keyboard navigation without third-party autocomplete libraries.
A typeahead/autocomplete search application built with Next.js App Router, React 19, TypeScript, and Tailwind CSS. The project focuses on debounced search, asynchronous request handling, accessibility, keyboard interaction, and protection against stale responses without third-party autocomplete libraries.

## Features

* **Debounced Search**: Keystrokes debounced at 350ms to minimize network traffic.
* **Stale-Request Cancellation**: In-flight requests cancelled via `AbortController` and guarded by monotonic request IDs.
* **Server-Side API Boundary**: Next.js Route Handler (`/api/countries`) acts as a boundary around the REST Countries API, avoiding browser CORS restrictions and normalizing responses.
* **Stale-Request Protection**: In-flight requests cancelled via `AbortController` and guarded by monotonic request IDs (`requestIdRef`).
* **Clamped Keyboard Navigation**: Predictable `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` navigation without wrapping.
* **Accessible Combobox**: WAI-ARIA combobox pattern keeping DOM focus on the input via `aria-activedescendant`.
* **Resilient States**: Loading, empty (translating HTTP 404), and error states without layout shift.
* **Responsive Interface**: Polished mobile and desktop layout with clear contrast.
* **Strict TypeScript**: Strict types matching required API fields without `any`.
* **Automated Tests**: 14 behavioral integration tests in Vitest and React Testing Library.
* **Clean State Handling**: Clear loading indicator, error handling, and empty state (`No countries found for '[query]'`) without layout shift.
* **Selection Details**: Selecting a country displays a detailed summary card and populates the input without triggering an extra search.
* **Strict TypeScript**: Typed interfaces for countries and API responses without using `any`.
* **Automated Tests**: 20 automated tests across component integration and server route handler suites.

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
npm test         # Run test suites (20 tests)
npm run lint     # Run ESLint
```

## Architecture

The project avoids global state or ready-made autocomplete packages:
The client communicates with an internal Next.js Route Handler rather than querying REST Countries directly from the browser:

```text
Browser (CountrySearch)
    ↓ fetch('/api/countries?q={query}')
Next.js Route Handler (src/app/api/countries/route.ts)
    ↓ GET https://restcountries.com/v3.1/name/...
REST Countries API
```

Repository structure:

```text
src/
├── app/
│   ├── globals.css         # Styling and system font stack
│   ├── layout.tsx          # HTML shell and metadata
│   └── page.tsx            # Centered search view layout
│   ├── api/
│   │   └── countries/
│   │       └── route.ts        # Server-side REST Countries API boundary and response normalization
│   ├── globals.css             # Theme variables and animations
│   ├── layout.tsx              # HTML shell and metadata
│   └── page.tsx                # Centered search view layout
├── components/
│   ├── CountryCard.tsx     # Selected country detail card
│   └── CountrySearch.tsx   # Combobox input, listbox, and state orchestration
│   ├── CountryCard.tsx         # Selected country detail card
│   └── CountrySearch.tsx       # Combobox input, listbox, and state orchestration
├── hooks/
│   └── useDebounce.ts      # Reusable debounce hook with cleanup
│   └── useDebounce.ts          # Reusable debounce hook with cleanup
└── types/
    └── country.ts          # Country interface
    └── country.ts              # Country and API response contracts

tests/
└── CountrySearch.test.tsx  # Behavioral test suite
├── CountrySearch.test.tsx      # Behavioral component tests (14 tests)
└── route.test.ts               # Route Handler unit tests (6 tests)
```

## Key Engineering Decisions

### Debouncing
A 350ms debounce balances responsiveness with network efficiency. Pending timers are cleaned up immediately when the query changes or the component unmounts.

### API Boundary
The frontend queries the application's `/api/countries?q={query}` endpoint rather than calling the REST Countries API directly. This Route Handler:
* provides a controlled boundary around the external API
* avoids browser CORS restrictions
* keeps the frontend decoupled from the external provider
* translates REST Countries HTTP 404 responses into `{ results: [] }`
* provides a consistent response contract to `CountrySearch`
* sanitizes upstream errors before returning them to the browser

### Race Conditions & Abort Handling
Fast typing can resolve responses out of order. We use `AbortController` to abort in-flight requests and a monotonic request counter (`requestIdRef`) to ensure older responses never overwrite newer state. `AbortError` rejections are caught silently.
Fast typing can cause asynchronous responses to resolve out of order. We use a dual-layer approach:
1. `AbortController`: Whenever a new search is dispatched or the component unmounts, any in-flight request is aborted. `AbortError` rejections are silently ignored so the user is never shown a false error.
2. Monotonic Request Counter (`requestIdRef`): Each request is tagged with an incrementing integer. Even if an older response resolves after a newer request, it is discarded before triggering a state update.

### Accessibility (Virtual Focus Pattern)
DOM focus remains strictly on the `<input>` element. As the user navigates, `aria-activedescendant` points to the highlighted option's ID, and active elements scroll into view. When closed, `aria-activedescendant` is safely set to `undefined`.
The combobox adheres to WAI-ARIA 1.2 patterns using a virtual focus model. Physical DOM focus remains strictly on the `<input>` element at all times, avoiding focus disorientation for screen reader and keyboard users. When an item is highlighted, `aria-activedescendant` references the option ID (`option-${country.cca2}`), and `scrollIntoView({ block: "nearest" })` ensures it remains visible. When closed or unhighlighted, `aria-activedescendant` is set to `undefined`.

### Clamped Keyboard Navigation
`ArrowDown` and `ArrowUp` clamp at the boundaries (`0` and `results.length - 1`, and `-1` for unselected) rather than cycling back around, avoiding accidental loop selections.
### Keyboard Navigation
Keyboard interaction uses boundary clamping rather than circular wrapping:
* `ArrowDown`: Moves highlight down, clamping at the last item (`results.length - 1`).
* `ArrowUp`: Moves highlight up, clamping at `-1` (returning focus to the input without selection).
* `Enter`: Selects the active item and closes the dropdown.
* `Escape`: Closes the dropdown and resets the active index.

### Minimum Query Length & 404 Handling
Searching starts at 2 trimmed characters to prevent broad, low-utility queries. The REST Countries API returns HTTP 404 when no records match; we deliberately map 404 to an empty array so users see `"No countries found for '[query]'"` instead of a false error.
### Minimum Query Length & Empty Results
Queries shorter than 2 trimmed characters do not trigger an API request and clear any active results. When a search yields no matches, the Route Handler translates the upstream 404 into `{ results: [] }`, allowing `CountrySearch` to render an informative `"No countries found for '[query]'"` message with `role="status"`.

### Selection Handling
A single `isSelectionRef` tracks item selection. Selecting a country updates the input and closes suggestions without triggering a redundant search. Typing again resets selection and resumes search mode.
A single `isSelectionRef` ref tracks when a country has been selected. Selecting an option updates the input text and closes the suggestion list without re-triggering the debounce search effect. If the user edits the input afterwards, selection state clears and normal search resumes.

### API Choice
REST Countries is suitable for a frontend demonstration, but a high-traffic production system would query a dedicated search service (e.g., Elasticsearch, Algolia, or a Postgres trigram index) behind a backend API proxy to ensure low latency and strict rate limiting.

## Production Considerations

* **Server-Side API Proxy / BFF**: Route requests through an internal endpoint to hide third-party latency and protect rate limits.
* **Edge Caching**: Cache common query prefixes on CDN edge nodes with `stale-while-revalidate`.
* **Request Deduplication**: Memoize identical queries client-side to prevent redundant round-trips.
* **Observability**: Track query latency, failure rates, and zero-result queries via APM (Datadog/Sentry).
* **Retry Strategy**: Implement exponential backoff on transient network failures.
### BFF Hardening
The existing Next.js Route Handler provides a thin server-side boundary around the external API. At higher traffic, it could be extended with:
* caching for repeated queries (e.g., in-memory or Redis caching, and CDN/edge caching with `stale-while-revalidate` where appropriate)
* rate limiting
* request deduplication where useful
* upstream request timeouts
* monitoring and observability (latency metrics, error rates, zero-result queries)
* response normalization
* appropriate retry strategies with backoff for transient failures

If data complexity or scale grows significantly, the boundary could be pointed to a dedicated search service (e.g., Elasticsearch or Algolia) without modifying the frontend contract.

## Testing Strategy

Tests in `tests/CountrySearch.test.tsx` verify end-to-end user behaviors:
* Debounce timer collapsing and obsolete request cancellation.
* Slower out-of-order responses resolving after faster responses.
* Silent handling of `AbortError`.
* Clamped keyboard navigation and ARIA attribute synchronization.
* Graceful rendering of loading, empty (404), and error states.
Testing is divided between component integration tests and server Route Handler unit tests (20 tests total):

* **Component Tests (`tests/CountrySearch.test.tsx` - 14 tests)**:
  * Minimum query length enforcement.
  * Debounce timer execution and keystroke cancellation.
  * Loading, empty, and error state presentation.
  * Clamped `ArrowDown` and `ArrowUp` navigation, `Enter` selection, and `Escape` closing.
  * Out-of-order response handling where slower older requests resolve after faster newer requests.
  * Silent suppression of `AbortError`.
  * Selection state display and clear button behavior.

* **Route Handler Tests (`tests/route.test.ts` - 6 tests)**:
  * Short query rejection (< 2 characters returning empty results without upstream calls).
  * Successful upstream query proxying.
  * Upstream HTTP 404 translation into `{ results: [] }`.
  * Upstream 500 error sanitization into HTTP 502 with friendly error messages.
  * Network exception handling returning sanitized HTTP 500.
  * Upstream payload normalization and fallback resilience.

## Tradeoffs

We avoided heavyweight state libraries and headless UI wrappers (Downshift, Radix) because localized React state keeps the bundle lightweight, dependencies lean, and core engineering decisions fully visible for review.
We chose standard React state and native DOM APIs over third-party combobox libraries (e.g., Downshift) or global state managers (e.g., Redux, Zustand). This decision keeps the bundle small, eliminates extra abstraction layers, and keeps core asynchronous and accessibility mechanisms explicit and easy to evaluate.

## Screening Task Write-up

This implementation balances engineering rigor with lean architecture. I opted against third-party combobox libraries and global state managers, keeping all state localized within a single custom combobox component and a reusable `useDebounce` hook. This keeps bundle overhead minimal and makes accessibility and lifecycle handling straightforward to review. A specific design choice was adopting the ARIA virtual focus model with clamped navigation: DOM focus remains on the input while `aria-activedescendant` tracks selection, eliminating DOM focus thrashing.
This implementation balances engineering rigor with lean architecture. I chose not to use ready-made combobox or state libraries, keeping state localized within a single custom combobox component and a reusable `useDebounce` hook. This keeps bundle overhead minimal and makes accessibility and lifecycle handling straightforward to evaluate. For accessibility, I adopted the ARIA virtual focus pattern with clamped keyboard navigation: DOM focus remains on the input while `aria-activedescendant` tracks selection, preventing focus jumping.

For high-traffic production use, this architecture would sit behind a server-side BFF proxy. The proxy would normalize country payloads, apply token-bucket rate limiting, and serve query prefixes from an edge cache using `stale-while-revalidate`. Query deduplication and client-side LRU caching (or a lightweight TanStack Query integration) would eliminate repeated network roundtrips for frequent keystroke deletions and re-types.
To avoid browser CORS limitations and decouple the client from the external provider, queries are routed through a Next.js server Route Handler (`/api/countries`). The handler provides a controlled boundary that validates input, sanitizes upstream errors, and normalizes REST Countries 404 responses into empty result arrays. Under higher traffic, this existing API boundary would be hardened with caching for common query prefixes, rate limiting, upstream timeouts, monitoring, and request deduplication. At massive scale or data complexity, search would transition to a dedicated search backend like Elasticsearch.

Testing is centered on integration behavior using Vitest and React Testing Library with simulated fake timers and mock responses. Rather than checking internal hook values, tests exercise real user journeys: verifying debounce cancellation under rapid typing, ensuring aborted requests do not leak errors, and confirming that older asynchronous resolutions cannot overwrite newer queries. Edge conditions—specifically REST Countries returning HTTP 404 for unmatched queries—are tested to ensure they cleanly render informative empty states instead of generic network failures.
Testing is split across two suites using Vitest and React Testing Library. Component tests verify real user interactions: debounce timer cancellation under rapid typing, clamped keyboard navigation, ARIA synchronization, and race condition protection using `AbortController` and request IDs. Route Handler tests independently verify query validation, 404 normalization, and upstream error handling.
