import type { Country } from "@/types/country";

interface CountryCardProps {
  country: Country;
}

export function CountryCard({ country }: CountryCardProps) {
  const capitalDisplay =
    country.capital && country.capital.length > 0
      ? country.capital.join(", ")
      : "N/A";

  const flagAlt =
    country.flags.alt || `Flag of ${country.name.common}`;

  return (
    <article
      aria-label={`Selected country: ${country.name.common}`}
      className="animate-card-enter w-full max-w-lg mt-6 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 p-6 shadow-lg shadow-zinc-200/50 backdrop-blur-xs transition-all dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-none"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Country Flag Thumbnail */}
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200/80 bg-zinc-100 shadow-xs dark:border-zinc-700/80 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={country.flags.svg || country.flags.png}
            alt={flagAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Details Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="truncate text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {country.name.common}
            </h2>
            <span className="shrink-0 rounded-md border border-zinc-200/70 bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700 dark:border-zinc-700/70 dark:bg-zinc-800 dark:text-zinc-300">
              {country.cca2}
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-3.5">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-800/40">
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Capital
              </span>
              <span className="mt-0.5 truncate block font-semibold text-zinc-800 dark:text-zinc-200">
                {capitalDisplay}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-800/40">
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Region
              </span>
              <span className="mt-0.5 truncate block font-semibold text-zinc-800 dark:text-zinc-200">
                {country.region}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
