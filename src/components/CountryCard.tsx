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
      className="w-full max-w-lg mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={country.flags.svg || country.flags.png}
            alt={flagAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {country.name.common}
            </h2>
            <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {country.cca2}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Capital
              </span>
              <span className="truncate block font-medium text-zinc-800 dark:text-zinc-200">
                {capitalDisplay}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Region
              </span>
              <span className="truncate block font-medium text-zinc-800 dark:text-zinc-200">
                {country.region}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

