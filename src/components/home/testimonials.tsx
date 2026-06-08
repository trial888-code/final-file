"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Marcus T.",
    tier: "Gold VIP",
    text: "Spinora made getting my game accounts so easy. The live chat support is incredibly fast and helpful.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    tier: "Platinum VIP",
    text: "Best gaming support platform I've used. VIP rewards are generous and the referral program is a game changer.",
    rating: 5,
  },
  {
    name: "James R.",
    tier: "Silver VIP",
    text: "Quick account setup, great selection of games, and the dashboard makes tracking everything simple.",
    rating: 5,
  },
];

export function Testimonials() {
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
            What Our <span className="gradient-text">Players Say</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4">&ldquo;{t.text}&rdquo;</p>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-primary">{t.tier}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
