# Body Ledger

A phone-first health tracker for GLP-1, weight, symptoms, food/drink, activity, meds,
POTS vitals, digestion, cycle, weather, and body measurements — built to spot patterns
behind flare-ups.

Everything is local-first: data lives in the browser's IndexedDB (via Dexie), so there's
no server, no account, and no network round-trip to race against when you log something.
Install it to your phone's home screen for an app-like experience (PWA).

## Stack

- Vite + React + TypeScript
- Dexie (IndexedDB) for storage, `dexie-react-hooks` for reactive queries
- Tailwind CSS
- `vite-plugin-pwa` for the installable/offline app shell

## Develop

```
npm install
npm run dev
```

## Build

```
npm run build
```

## What's included

- **Today** — quick taps (water, coffee, electrolytes, repeat last meal), an
  auto-assumed daily-meds card (tap to mark anything missed), weekly and
  as-needed meds, GLP-1 dosing with injection-site rotation, and today's full log.
- **Log** (the `+` button) — food (with tags), drinks, activity, symptoms
  (pain with location/type/flare toggle, or general symptoms), POTS vitals
  (lying vs. standing HR/BP), GLP-1 doses, digestion, body measurements,
  a daily check-in (weight, sleep, energy, mood, stress, cycle), weather,
  and one-time meds/supplements.
- **Trends** — weight vs. goal, a 12-week pain calendar, a pain timeline
  overlaid against sleep/fluids/pressure, symptoms by days-since-dose, body
  measurement trends, and a "what comes before flares" comparison of flare
  days vs. other days (needs ~2 weeks of daily pain logging).
- **Flares** — one-tap flare logging plus history with day-before/day-of context.
- **Setup** — goal weight, meds & supplements list, GLP-1 injection sites,
  and CSV/JSON export.
