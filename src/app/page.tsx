import { CountrySearch } from "@/components/CountrySearch";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Explore Countries
        </h1>
        <p className="mt-3 text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
          Search for a country to discover basic information.
        </p>
      </div>

      <div className="mt-8 flex w-full justify-center">
        <CountrySearch />
      </div>
    </main>
  );
}
