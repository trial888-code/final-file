"use client";

import { motion } from "framer-motion";
import { UserPlus, Gamepad2, Crown, Gift } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up for free and get your unique referral code instantly.",
  },
  {
    icon: Gamepad2,
    title: "Request Game Account",
    description: "Choose from 13+ popular gaming platforms and submit your request.",
  },
  {
    icon: Crown,
    title: "Earn VIP Rewards",
    description: "Accumulate points and unlock Bronze to Platinum VIP tiers.",
  },
  {
    icon: Gift,
    title: "Enjoy Benefits",
    description: "Get priority support, exclusive promotions, and referral bonuses.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How <span className="gradient-text">Spinora</span> Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes with our simple 4-step process.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-xl p-6 text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl gradient-bg mb-4">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div className="text-xs text-primary font-semibold mb-2">Step {i + 1}</div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
