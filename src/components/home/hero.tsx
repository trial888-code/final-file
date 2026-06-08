"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Premium Gaming Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Premium Gaming Support &{" "}
              <span className="gradient-text">Account Platform</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Get instant access to top gaming platforms with {SITE_NAME}. Request accounts, earn VIP rewards, and enjoy 24/7 live support from our expert team.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="glow-purple">
                <Link href="/register">
                  Request Game Account <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/support">
                  <MessageCircle className="h-5 w-5" /> Live Chat Support
                </Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-8">
              {[
                { value: "10K+", label: "Active Users" },
                { value: "13+", label: "Game Platforms" },
                { value: "24/7", label: "Live Support" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 gradient-bg rounded-3xl blur-2xl opacity-20" />
              <Image
                src="/logo.jpeg"
                alt={`${SITE_NAME} Logo`}
                width={400}
                height={400}
                className="relative rounded-3xl glow-purple"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
