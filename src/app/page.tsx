import { HeroStatic } from "@/components/home/hero-static";
import { HomeLandingShell } from "@/components/home/home-landing-shell";

/** Static home — hero SSR for LCP; reviews load client-side when scrolled into view */
export const dynamic = "force-static";

export default function HomePage() {
  return <HomeLandingShell hero={<HeroStatic />} />;
}
