import Link from "next/link";
import { MapPin } from "lucide-react";

import { GEO_STATES } from "@/lib/geo-data";

const states = Object.values(GEO_STATES);

export function PlayByStateSection() {
  return (
    <section aria-labelledby="play-by-state-heading" className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="rounded-2xl border border-white/5 bg-[#161616] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-orange-400" aria-hidden />
          <h2 id="play-by-state-heading" className="text-lg font-bold">
            Play by state
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
          Find guides and game info for your state — Texas, Florida, Georgia, California and more.
        </p>
        <div className="space-y-4">
          {states.map((state) => (
            <div key={state.slug} className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link
                href={`/${state.slug}`}
                className="text-sm font-semibold text-white hover:text-orange-400 transition-colors"
              >
                {state.name}
              </Link>
              <span className="text-white/20 hidden sm:inline">·</span>
              {state.cities.slice(0, 4).map((city) => (
                <Link
                  key={city.slug}
                  href={`/${state.slug}/${city.slug}`}
                  className="text-xs text-muted-foreground hover:text-orange-400 transition-colors"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
