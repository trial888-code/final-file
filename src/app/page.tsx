import { HeroStatic } from "@/components/home/hero-static";
import { HomeLandingShell } from "@/components/home/home-landing-shell";
import { LiveWinFeed } from "@/components/home/live-win-feed";
import { JackpotCounter } from "@/components/home/jackpot-counter";
import { PlayByStateSection } from "@/components/marketing/play-by-state-section";
import { HomeFaq } from "@/components/spinora/home-faq";
import { HomeGuides } from "@/components/spinora/home-guides";
import { HomeReviews } from "@/components/spinora/home-reviews";
import { getFaqs, getHomepageReviews, getLatestBlogPosts } from "@/lib/data/marketing";

export const revalidate = 300;

export default async function HomePage() {
  const [faqs, reviews, guides] = await Promise.all([
    getFaqs(),
    getHomepageReviews(),
    getLatestBlogPosts(),
  ]);

  const cmsSections = (
    <div className="space-y-10 py-4">
      {/* Stake/Roobet Style Live Winner Ticker & Progressive Jackpot Counter */}
      <LiveWinFeed />
      <JackpotCounter />

      {guides.length > 0 && <HomeGuides posts={guides} />}
      {reviews.length > 0 && <HomeReviews reviews={reviews} />}
      <PlayByStateSection />
      {faqs.length > 0 && <HomeFaq faqs={faqs} />}
    </div>
  );

  return (
    <HomeLandingShell hero={<HeroStatic />} cmsSections={cmsSections} />
  );
}
