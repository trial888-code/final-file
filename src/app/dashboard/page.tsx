import Link from "next/link";
import {
  Banknote,
  Crown,
  Flame,
  Gamepad2,
  Gift,
  History,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { ClaimButton } from "@/components/dashboard/claim-button";
import { GameAccountsSection } from "@/components/dashboard/game-accounts";
import { HomeGuides } from "@/components/spinora/home-guides";
import { HomeReviews } from "@/components/spinora/home-reviews";
import { HomeFaq } from "@/components/spinora/home-faq";
import {
  getActiveJobsByGame,
  getCreatableGames,
  getDashboardCore,
  getGameAccounts,
  getRecentActivity,
  getRewardsOverview,
  getWalletData,
} from "@/lib/data/dashboard";
import { getFaqs, getHomepageReviews, getLatestBlogPosts } from "@/lib/data/marketing";

const QUICK_ACTIONS = [
  { label: "Add Funds", sub: "Top up wallet", href: "/dashboard/deposit", icon: Plus, accent: "text-ws-green-deep dark:text-ws-green" },
  { label: "Browse Games", sub: "Create & play", href: "/games", icon: Gamepad2, accent: "text-ws-green-deep dark:text-ws-green" },
  { label: "Daily Spin", sub: "Free rewards", href: "/spin", icon: Sparkles, accent: "text-ws-gold-deep dark:text-ws-gold" },
  { label: "Refer & Earn", sub: "Invite friends", href: "/dashboard/referrals", icon: Gift, accent: "text-ws-green-deep dark:text-ws-green" },
];

export default async function DashboardHomePage() {
  const core = await getDashboardCore();
  const { profile, tier } = core;
  const multiplier = Number(tier?.reward_multiplier ?? 1);
  const displayName = profile.display_name ?? profile.username ?? "Player";

  const [rewards, activity, gameAccounts, wallet, creatableGames, activeJobs, guides, faqs, reviews] =
    await Promise.all([
      getRewardsOverview(profile, multiplier),
      getRecentActivity(6),
      getGameAccounts(),
      getWalletData(),
      getCreatableGames(),
      getActiveJobsByGame(),
      getLatestBlogPosts(),
      getFaqs(),
      getHomepageReviews(),
    ]);

  const daily = rewards.streams.find((s) => s.rule.reward_type === "daily");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your wallet, games and rewards in one place.</p>
        </div>
        <Link
          href="/dashboard/vip"
          className="inline-flex items-center gap-1.5 rounded-full border border-ws-green/30 bg-ws-green/10 px-3 py-1.5 text-xs font-semibold text-ws-green-deep dark:text-teal-200"
        >
          <Crown className="h-3.5 w-3.5 text-ws-gold-deep dark:text-ws-gold" /> {tier?.name ?? "VIP"} · {multiplier}× rewards
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-ws-green/30 bg-gradient-to-br from-ws-green/10 to-ws-green/5 p-5 dark:from-[#10271d] dark:to-[#0b1a13]">
          <div>
            <div className="flex items-center gap-2 text-ws-green-deep dark:text-emerald-100/80">
              <Wallet className="h-4 w-4 text-ws-gold-deep dark:text-ws-gold" />
              <span className="text-xs font-semibold uppercase tracking-wider">Wallet balance</span>
            </div>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">${wallet.balance.toLocaleString()}</p>
          </div>
          <Link href="/dashboard/deposit" className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white">
            Add Funds
          </Link>
        </div>
        <div className="rounded-2xl border border-ws-green/30 bg-gradient-to-br from-ws-green/10 to-ws-green/5 p-5 dark:from-emerald-950/60 dark:to-[#161616]">
          <div className="flex items-center gap-2 text-ws-green-deep dark:text-emerald-100/80">
            <Banknote className="h-4 w-4 text-ws-green-deep dark:text-ws-green" />
            <span className="text-xs font-semibold uppercase tracking-wider">Cash-out balance</span>
          </div>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">${wallet.cashout.toLocaleString()}</p>
          <Link href="/dashboard/wallet" className="mt-1 inline-block text-xs text-ws-green-deep dark:text-emerald-300/90 underline-offset-4 hover:underline">
            View wallet history →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-ws-surface-3"
          >
            <span className={`shrink-0 ${a.accent}`}>
              <a.icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{a.label}</p>
              <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {daily && (
        <div className="flex flex-col gap-4 rounded-2xl border border-ws-green/25 bg-gradient-to-br from-ws-green/10 to-ws-green/5 p-5 dark:from-emerald-950/30 dark:to-[#161616] sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ws-green-deep dark:text-emerald-300">Daily reward</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {daily.claimed ? "Claimed — streak secured" : "Your daily reward is ready"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {daily.claimed
                ? `Come back tomorrow to extend your ${profile.current_streak ?? 0}-day streak.`
                : `${Math.round(daily.rule.coins * multiplier).toLocaleString()} coins + ${daily.rule.xp.toLocaleString()} XP${multiplier > 1 ? ` · ${multiplier}× VIP boost` : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-ws-green-deep dark:text-ws-green">
              <Flame className="h-5 w-5" aria-hidden />
              <span className="tabular-nums text-lg font-bold">{profile.current_streak ?? 0}</span>
              <span className="text-xs text-muted-foreground">streak</span>
            </span>
            <ClaimButton ruleKey={daily.rule.key} claimed={daily.claimed} size="lg">
              <Gift className="size-4" aria-hidden /> Claim
            </ClaimButton>
          </div>
        </div>
      )}

      <GameAccountsSection
        accounts={gameAccounts}
        walletBalance={wallet.balance}
        creatableGames={creatableGames}
        activeJobs={activeJobs}
      />

      <div className="rounded-2xl border border-foreground/10 bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</p>
          <Link href="/dashboard/activity" className="text-xs font-medium text-ws-green-deep dark:text-ws-green underline-offset-4 hover:underline">
            Full history
          </Link>
        </div>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <History className="h-8 w-8 text-foreground/15" aria-hidden />
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-foreground">{item.description}</span>
                <time dateTime={item.created_at} className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>

      <HomeGuides posts={guides} />
      <HomeReviews reviews={reviews} />
      <HomeFaq faqs={faqs} limit={5} />
    </div>
  );
}
