"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VIP_TIERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function VipPreview() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <Crown className="inline h-8 w-8 text-yellow-400 mr-2" />
            VIP <span className="gradient-text">Rewards</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Climb the ranks from Bronze to Platinum and unlock exclusive gaming benefits.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VIP_TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-6 hover:glow-purple transition-all"
            >
              <div className={cn("h-1 w-12 rounded-full bg-gradient-to-r mb-4", tier.color)} />
              <h3 className="text-lg font-bold mb-1">{tier.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{tier.minPoints}+ points</p>
              <ul className="space-y-2">
                {tier.benefits.map((b) => (
                  <li key={b} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">&#10003;</span> {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button asChild>
            <Link href="/vip">Explore VIP Program</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
