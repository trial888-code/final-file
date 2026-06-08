import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { promotionsMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { Gift, Zap, Star } from "lucide-react";

export const metadata = promotionsMetadata;

const promotions = [
  {
    title: "Welcome Bonus",
    description: "New members receive 200 VIP points upon registration. Start your journey with instant rewards.",
    type: "promotion" as const,
    badge: "New Users",
    icon: Gift,
  },
  {
    title: "VIP Double Points Weekend",
    description: "Earn 2x VIP points on all game account requests every weekend. Climb tiers faster!",
    type: "promotion" as const,
    badge: "Limited Time",
    icon: Zap,
  },
  {
    title: "Referral Boost",
    description: "Refer 5 friends this month and receive a bonus 500 VIP points plus exclusive game access.",
    type: "promotion" as const,
    badge: "Monthly",
    icon: Star,
  },
  {
    title: "New Games Added",
    description: "Fire Kirin, Juwa, Panda Master, and more platforms now available for instant account requests.",
    type: "update" as const,
    badge: "Update",
    icon: Gift,
  },
];

export default function PromotionsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Promotions" }]} />

          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Promotions & <span className="gradient-text">Bonuses</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Discover exclusive Spinora promotions, limited-time bonuses, and special offers for our gaming community.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {promotions.map((promo) => {
              const Icon = promo.icon;
              return (
                <Card key={promo.title} className="hover:glow-purple transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant={promo.type === "promotion" ? "default" : "secondary"}>
                        {promo.badge}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4">{promo.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{promo.description}</p>
                    <Button size="sm" asChild>
                      <Link href="/register">Claim Offer</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
