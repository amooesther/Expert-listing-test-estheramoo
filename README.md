# Country Typeahead Search

## Overview

A typeahead/autocomplete search application built with Next.js App Router, React 19, TypeScript, and Tailwind CSS. The project focuses on debounced search, asynchronous request handling, accessibility, keyboard interaction, and protection against stale responses without third-party autocomplete libraries.

## Features

* **Debounced Search**: Keystrokes debounced at 350ms to minimize network traffic.
* **Server-Side API Boundary**: Next.js Route Handler (`/api/countries`) acts as a boundary around the REST Countries API, avoiding browser CORS restrictions and normalizing responses.
* **Stale-Request Protection**: In-flight requests cancelled via `AbortController` and guarded by monotonic request IDs (`requestIdRef`).
* **Clamped Keyboard Navigation**: Predictable `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` navigation without wrapping.
* **Accessible Combobox**: WAI-ARIA combobox pattern keeping DOM focus on the input via `aria-activedescendant`.
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
npm test         # Run test suites (20 tests)
npm run lint     # Run ESLint
```

## Architecture

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
│   ├── api/
│   │   └── countries/
│   │       └── route.ts        # Server-side REST Countries API boundary and response normalization
│   ├── globals.css             # Theme variables and animations
│   ├── layout.tsx              # HTML shell and metadata
│   └── page.tsx                # Centered search view layout
├── components/
│   ├── CountryCard.tsx         # Selected country detail card
│   └── CountrySearch.tsx       # Combobox input, listbox, and state orchestration
├── hooks/
│   └── useDebounce.ts          # Reusable debounce hook with cleanup
└── types/
    └── country.ts              # Country and API response contracts

tests/
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
Fast typing can cause asynchronous responses to resolve out of order. We use a dual-layer approach:
1. `AbortController`: Whenever a new search is dispatched or the component unmounts, any in-flight request is aborted. `AbortError` rejections are silently ignored so the user is never shown a false error.
2. Monotonic Request Counter (`requestIdRef`): Each request is tagged with an incrementing integer. Even if an older response resolves after a newer request, it is discarded before triggering a state update.

### Accessibility (Virtual Focus Pattern)
The combobox adheres to WAI-ARIA 1.2 patterns using a virtual focus model. Physical DOM focus remains strictly on the `<input>` element at all times, avoiding focus disorientation for screen reader and keyboard users. When an item is highlighted, `aria-activedescendant` references the option ID (`option-${country.cca2}`), and `scrollIntoView({ block: "nearest" })` ensures it remains visible. When closed or unhighlighted, `aria-activedescendant` is set to `undefined`.

### Keyboard Navigation
Keyboard interaction uses boundary clamping rather than circular wrapping:
* `ArrowDown`: Moves highlight down, clamping at the last item (`results.length - 1`).
* `ArrowUp`: Moves highlight up, clamping at `-1` (returning focus to the input without selection).
* `Enter`: Selects the active item and closes the dropdown.
* `Escape`: Closes the dropdown and resets the active index.

### Minimum Query Length & Empty Results
Queries shorter than 2 trimmed characters do not trigger an API request and clear any active results. When a search yields no matches, the Route Handler translates the upstream 404 into `{ results: [] }`, allowing `CountrySearch` to render an informative `"No countries found for '[query]'"` message with `role="status"`.

### Selection Handling
A single `isSelectionRef` ref tracks when a country has been selected. Selecting an option updates the input text and closes the suggestion list without re-triggering the debounce search effect. If the user edits the input afterwards, selection state clears and normal search resumes.

## Production Considerations

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

We chose standard React state and native DOM APIs over third-party combobox libraries (e.g., Downshift) or global state managers (e.g., Redux, Zustand). This decision keeps the bundle small, eliminates extra abstraction layers, and keeps core asynchronous and accessibility mechanisms explicit and easy to evaluate.

## Screening Task Write-up

This implementation balances engineering rigor with lean architecture. I chose not to use ready-made combobox or state libraries, keeping state localized within a single custom combobox component and a reusable `useDebounce` hook. This keeps bundle overhead minimal and makes accessibility and lifecycle handling straightforward to evaluate. For accessibility, I adopted the ARIA virtual focus pattern with clamped keyboard navigation: DOM focus remains on the input while `aria-activedescendant` tracks selection, preventing focus jumping.

To avoid browser CORS limitations and decouple the client from the external provider, queries are routed through a Next.js server Route Handler (`/api/countries`). The handler provides a controlled boundary that validates input, sanitizes upstream errors, and normalizes REST Countries 404 responses into empty result arrays. Under higher traffic, this existing API boundary would be hardened with caching for common query prefixes, rate limiting, upstream timeouts, monitoring, and request deduplication. At massive scale or data complexity, search would transition to a dedicated search backend like Elasticsearch.

Testing is split across two suites using Vitest and React Testing Library. Component tests verify real user interactions: debounce timer cancellation under rapid typing, clamped keyboard navigation, ARIA synchronization, and race condition protection using `AbortController` and request IDs. Route Handler tests independently verify query validation, 404 normalization, and upstream error handling.
