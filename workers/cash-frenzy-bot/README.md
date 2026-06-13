# Spinora Cash Frenzy Bot

Automates the **Cash Frenzy** agent panel (`agentserver.cashfrenzy777.com`) for account
creation, recharge (load), redeem, and balance checks. Same **layui MDI** backend as
Gameroom / Cash Machine — stay on `/admin`, open **Game User → User Management**, then
work inside the player list iframe. It polls the Supabase queue for `cash-frenzy` jobs.

## Setup

```bash
cd workers/cash-frenzy-bot
npm install
npx playwright install chrome
cp .env.example .env   # then fill in the values
```

Fill `.env`:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — same project as Spinora.
- `CASHFRENZY_ADMIN_URL=https://agentserver.cashfrenzy777.com/admin/login`
- `CASHFRENZY_AGENT_USERNAME` (used only to pre-fill the login form)

## Running (the panel needs a CAPTCHA, so use CDP mode)

```bat
start-chrome-for-bot.bat        REM opens Chrome on port 9229
REM log in to the panel manually (type the captcha)
REM open Game User → User Management on /admin
REM set CASHFRENZY_CDP_URL=http://127.0.0.1:9229 in .env
start-bot.bat
```

If the Chrome session expires, re-run `start-chrome-for-bot.bat`, log in again,
open User Management, then restart `start-bot.bat`.

## Verifying selectors (optional)

```bash
CASHFRENZY_HEADLESS=false npm run probe          # login + user list dump
node scripts/probe-dialogs.mjs                  # capture create/recharge/redeem dialogs (CDP)
npx tsx scripts/test-readonly.ts <account>      # read a balance (no money moves)
```

## How jobs flow

1. The website inserts a `game_load_requests` row (slug `cash-frenzy`).
2. This worker calls `claim_next_game_load('cash-frenzy')`.
3. It performs the panel action and calls `complete_game_load(...)`.
4. The user gets an in-app notification with the result.

`load_type` handled: `create_account` / `new_account`, `load` / `reload`,
`redeem` (supports redeem-all), and `check_balance`.
