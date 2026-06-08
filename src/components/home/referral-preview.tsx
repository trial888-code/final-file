"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Share2, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReferralPreview() {
  return (
    <section className="py-20 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass rounded-2xl p-8 sm:p-12 grid lg:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">
              Refer & <span className="gradient-text">Earn Rewards</span>
            </h2>
            <p className="text-muted-foreground mb-6">
              Share your unique referral link and earn VIP points for every friend who joins Spinora. The more you refer, the higher your VIP tier climbs.
            </p>
            <Button asChild>
              <Link href="/register">Start Referring</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { icon: Share2, label: "Share Link", value: "1-Click" },
              { icon: Users, label: "Friends Join", value: "+100 pts" },
              { icon: Gift, label: "Earn Rewards", value: "Up to 25%" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="text-center p-4 rounded-xl bg-muted/50">
                  <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-lg font-bold gradient-text">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
