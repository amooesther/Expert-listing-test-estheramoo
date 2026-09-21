import { CountrySearch } from "@/components/CountrySearch";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col items-center justify-start px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:pt-28">
      {/* Background atmospheric ambient gradients (pure CSS, non-interactive, aria-hidden) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 h-[30rem] w-[50rem] rounded-full bg-gradient-to-tr from-sky-400/15 via-teal-300/10 to-indigo-500/15 blur-3xl dark:from-sky-900/20 dark:via-teal-900/15 dark:to-indigo-950/25" />
        <div className="absolute top-1/4 -left-48 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-900/10" />
        <div className="absolute top-1/2 -right-48 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-900/10" />
      </div>

      <div className="w-full max-w-xl text-center">
        {/* Subtle exploration eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-white/80 px-3.5 py-1 text-xs font-medium text-sky-800 shadow-xs backdrop-blur-xs dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300 mb-5">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Discover the world, one search at a time.</span>
        </div>

        {/* Heading with globe icon */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 dark:from-sky-400 dark:to-indigo-500 dark:shadow-sky-950/40">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9 9 0 100-18 9 9 0 000 18z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.6 9h16.8M3.6 15h16.8"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Explore Countries
          </h1>
        </div>

        <p className="mt-3.5 text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
          Search for a country to discover basic information.
        </p>
      </div>

      <div className="mt-8 flex w-full justify-center">
        <CountrySearch />
      </div>
    </main>
  );
}
