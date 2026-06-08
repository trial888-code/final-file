import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { PopularGames } from "@/components/home/popular-games";
import { HowItWorks } from "@/components/home/how-it-works";
import { VipPreview } from "@/components/home/vip-preview";
import { ReferralPreview } from "@/components/home/referral-preview";
import { ActivityFeed } from "@/components/home/activity-feed";
import { Testimonials } from "@/components/home/testimonials";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PopularGames />
        <HowItWorks />
        <VipPreview />
        <ReferralPreview />
        <ActivityFeed />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
