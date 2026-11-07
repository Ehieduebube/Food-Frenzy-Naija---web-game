# Food Frenzy Naija

A match-3 puzzle game for **LagosLife Games**, built around Nigerian food. Swipe jollof rice, dodo, puff-puff, akara, suya, moi moi and chin-chin into matches across 40 levels, from Lagos Mainland to the Naija Food Carnival.

Built with React 19, TypeScript, Vite and zustand. All artwork (SVG) and all sound and music (Web Audio) are original and generated in code. No image or audio files are downloaded, so nothing can fail to load.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173  (opens straight into the game)
npm run build        # type-check + production bundle in dist/
npm run preview      # serve the production bundle with the same headers as vercel.json
npm test             # engine, progress, controller, level, Vatar and purchase-server tests (vitest)
npm run simulate     # bot plays every level: win rates, moves used, score spread
```

## How it fits into LagosLife Games

The game is a self-contained module. In this project, `src/main.tsx` mounts it full screen as soon as the page opens. There is no game list in front of it:

```
src/
  main.tsx                    calls Vatar.init() first, then mounts <FoodFrenzyNaija platform={…} />
  vatar/vatarPlatform.ts      LagosLife Games adapter for the Vatar Games SDK v1
  games/food-frenzy-naija/    the game module: everything it needs lives in this folder
    index.ts                  public API
    platform.ts               GamePlatform interface (player, leaderboard, pause/resume, purchases)
api/
  claim.mjs                   Vercel Function POST /api/claim: checks a purchase with Vatar and marks it delivered
  _lib/vatarClaim.mjs         the checks themselves (tested in tests/claim.test.ts)
vercel.json                   response headers (CSP frame-ancestors for the LagosLife player)
.env.example                  names of the server-side secrets (no values)
```

With no `onExit` passed, the main menu hides its "Back to LagosLife Games" button. To mount it inside a larger platform later, pass one:

```tsx
import { FoodFrenzyNaija } from './games/food-frenzy-naija';

<FoodFrenzyNaija onExit={() => navigate('/games')} />;
```

Progress uses `localStorage` by default (key `lagoslife.foodFrenzyNaija.save`). Saves made before the game was renamed are moved to this key automatically the first time the game loads. To sync with LagosLife accounts later, pass a `storage` object that implements `ProgressStorage` (`read(): string | null`, `write(json)`). For example, it could be backed by an API. All styles are scoped under `.ffn`, so the game won't restyle the host page.

## LagosLife Games (Vatar Games SDK v1)

Everything below follows the official docs at https://lagoslife.app/developers/docs. The game only uses documented SDK calls.

| Docs requirement | Where it is done |
| --- | --- |
| Load the SDK with `<script src="https://lagoslife.app/sdk/vatar-games-v1.js">`, from lagoslife.app, never a copy | `index.html`, before the game's own script |
| Call `Vatar.init()` first | `src/main.tsx` calls it once, before the first render. The game never waits for it. |
| `Vatar.onPause` / `Vatar.onResume`: stop sound and timers until resume | Sound is suspended. In a level, the pause menu opens, which stops input and hints. On resume, sound comes back and the player taps Resume. |
| Sound starts only after the player's first tap | The audio engine is only created on the first tap or key press |
| `Vatar.submitScore(n)`: best whole number per player, at most one every 20 s | The score is the **total of the player's best score on every completed level**. It is sent after connecting and again whenever it grows. Quick updates are merged, and `too_soon`, `rate_limited`, `timeout` and `busy` are retried after 20 s. |
| `Vatar.leaderboard()`: refreshed at most every 30 s, 12 calls a minute | Leaderboard button (top left of the main menu), shown only when connected. Results are cached for 30 s. In the sandbox it is labelled "Test board". |
| `Vatar.purchase(productId)`, then your server checks it with `GET /purchases/{id}` (paid, and this player's?), gives it once per `purchaseId`, and calls `POST /purchases/{id}/deliver` | **Coin packs** in the Boosters shop, shown only when connected. Every purchase goes to `api/claim.mjs` before any coins are given. See "Purchases" below. |
| `Vatar.purchases()` after `init()`, and `Vatar.onPurchase` | Both are handled: anything paid but not delivered, or still being checked, is claimed when the game opens |
| `Content-Security-Policy: frame-ancestors …` with the five documented origins, and no `X-Frame-Options` | `vercel.json`, applied to every path |
| Phone first, 375 × 812 portrait, touch, no hover-only controls | The existing responsive layout fills the frame. Tested at 375 × 812 inside a frame with the same `sandbox`/`allow` attributes the player uses. |

**When the SDK isn't available, the game still plays.** If the script fails to load, `window.Vatar` is missing. If the page is opened on its own, every call rejects with `not_framed`. If the player never answers, the SDK gives up after 10 s. In all three cases the game logs one line to the console and plays as normal, with no leaderboard button.

**Keys and environment variables.** The browser code has no keys. The SDK has no public key, and test or live mode is chosen by where the game is opened (the Vatar sandbox is `test`, the Games app is `live`). The secret keys live only in the server function, read from two separate Vercel environment variables:

| Variable | Value | When |
| --- | --- | --- |
| `VATAR_TEST_SECRET` | your `vtr_test_…` key | now, for the sandbox |
| `VATAR_LIVE_SECRET` | your `vtr_live_…` key | after approval |

Set both for the **Production** environment. The sandbox opens your production address, so test purchases reach the production deployment too. The server picks the key by the player's mode. It refuses a key with the wrong prefix (for example a live key in the test variable). Never name them `VITE_…`: Vite copies those into the browser bundle. `.env*` files (except `.env.example`) and `.vercel/` are git-ignored, so secrets can't be committed.

**Saves.** Progress stays in `localStorage` exactly as before. Inside the LagosLife frame the game is a third-party site, and browsers keep its storage separate from the standalone site's. So a save made at the standalone URL doesn't appear in the frame, or the other way round. The docs don't offer a cloud save.

### Purchases: coin packs

| Product id (create it in the dashboard with exactly this id) | Type | Gives |
| --- | --- | --- |
| `coins_500` | consumable | 500 coins |
| `coins_1500` | consumable | 1,500 coins |

The name and price are set in the Vatar dashboard (₦100 to ₦50,000). LagosLife's own pay sheet shows them, so the game never shows or sends a price. To change what a pack gives, edit `src/games/food-frenzy-naija/progress/coinPacks.ts`. To add or rename a pack, change that file **and** `PRODUCT_IDS` in `api/_lib/vatarClaim.mjs`. A test fails if the two lists differ.

How a purchase flows:

1. The player taps **Buy**. `Vatar.purchase(productId)` opens LagosLife's pay sheet, and the game is paused (`onPause`).
2. Once paid, the game gets a fresh `Vatar.session()` token and posts `{ session, purchaseId, mode }` to `/api/claim`.
3. `api/claim.mjs` calls `POST /session/verify`, then `GET /purchases/{id}`. It checks that the purchase is paid (or already delivered), belongs to the same player and mode, and is a product the game sells. Then it calls `POST /purchases/{id}/deliver`, and only after that answers `200 { purchaseId, productId }`.
4. The game adds the coins and records the `purchaseId` in the save, so the same purchase is never given twice, even if it's announced again.

If the server or Vatar can't be reached, the player sees "Payment received" and the game keeps the purchase. It retries after 3, 10, 30 and 60 seconds, and again on the next visit, along with anything `Vatar.purchases()` lists. A refunded purchase, another player's purchase, or an unknown product is never delivered and gives nothing.

Coins live in the player's save on the device, like all progress. The server confirms that every purchase is real and marks it delivered, as the docs require. Giving the coins happens in the game, once per `purchaseId`. Webhooks are optional and not used. Multiplayer only applies to multiplayer games.

## Deploy to Vercel

The project is a standard Vite app. Vercel detects it: build command `npm run build`, output directory `dist`. Files in `api/` become Vercel Functions (`api/claim.mjs` → `/api/claim`). Files under `api/_lib/` are shared code, not endpoints. There are no routes to rewrite, because the game is one page at `/`. `vercel.json` only adds the embedding header.

1. Push the project to GitHub, GitLab or Bitbucket (`dist/`, `node_modules/` and `.env*` are ignored).
2. In Vercel, choose **Add New → Project**, import the repository and keep the detected Vite settings.
3. In **Settings → Environment Variables**, add `VATAR_TEST_SECRET` (Production) with your `vtr_test_…` key. After approval, add `VATAR_LIVE_SECRET`. A new or changed variable only takes effect after you **redeploy**.
4. Deploy, then check the header on the production URL:
   `curl -sI https://<your-project>.vercel.app/ | grep -i content-security-policy`
5. Open the URL directly: the game should play normally, standalone, with no coin packs (they only appear inside LagosLife).

## Gameplay

| | |
| --- | --- |
| **Swap** | Swipe a food toward a neighbour, or tap one and then the other. Keyboard: arrow keys + Enter. |
| **Pause** | Pause button, `Esc` or `P` |
| **Match 4** | **Dodo Rocket**: clears its row or column (the arrows show which) |
| **Match L / T** | **Jollof Blast**: clears a rounded 5×5 area |
| **Match 5** | **Suya Fire**: swap with any food to burn every piece of that food |
| **Combos** | Rocket+Rocket = cross · Rocket+Blast = 3 rows + 3 columns · Blast+Blast = huge blast · Fire+Rocket/Blast = that whole food becomes rockets/blasts · Fire+Fire = whole board |

**Boosters** never cost a move. They are earned from levels, daily rewards and awards, or bought with coins. Each unlocks at a set level:

- **Chef's Ladle** (level 4): scoops out one food or knocks a layer off an obstacle.
- **Food Shuffle** (level 6): rearranges the board.
- **Extra Moves** (level 9): adds 5 moves. It is also offered on the "out of moves" screen.
- **Mama's Pot** (level 12): clears a 5×5 area, including every obstacle layer.

**Obstacles** arrive gradually:

- **Food baskets** (level 11): cleared by an adjacent match.
- **Leaf wraps** (level 13): the food can't move until a match on it or next to it unties it. Double wraps take two.
- **Palm-oil spills** (level 15): cleaned by matching on top of them. Thick spills take two matches.
- **Pepper crates** (level 16): take 2–3 hits.
- **Restricted cells** (level 17): food falls straight past the gaps.

**Progression:** a 40-level map in four regions. Each level is scored 1–3 stars, and leftover moves become an **Owambe Finale** of rockets. There are also:

- A 7-day **daily reward** cycle. Missing a day doesn't reset it.
- A **daily challenge** that is the same board for everyone on a given date, with its reward paid once a day.
- 19 **awards**, a coin **shop**, and settings for sound, music, vibration and reduced motion.

## Architecture

```
games/food-frenzy-naija/
  engine/        pure TypeScript game logic, no DOM (unit tested, simulated headlessly)
    board.ts       board model, layouts, generation without starting matches
    match.ts       line/group detection, special-piece rules
    moves.ts       swap validation, valid-move search
    resolve.ts     clearing, chain reactions, obstacle damage, combos, boosters, cascades
    gravity.ts     falling and refilling (columns split by fixed obstacles)
    shuffle.ts     dead-board reshuffle (keeps tile identity for animation)
    game.ts        session: moves, score, goals, win/lose, boosters, finale
    goals.ts, scoring.ts, bot.ts (hint + level-tuning bot), rng.ts (seeded)
  levels/        data-driven level configs (levels.ts), daily challenge generator
  progress/      save schema + validation/migration, storage adapters, rewards, awards, profile store
  session/       GameController: paces engine steps into timed animation beats
  audio/         procedural sound effects and highlife-style music loop
  art/           SVG food, specials, obstacles, boosters, scenery, Mama Put mascot
  ui/            screens, board renderer, HUD, modals
```

A move resolves instantly in the engine. The engine returns a list of steps (swap, clear phases, fall, shuffle), and the controller replays them with timers. Because animations only pace what is already decided, an animation can never leave the board stuck. Tiles are positioned in percentages, so resizing or rotating mid-animation can't misplace anything.

### Adding a level

Append an entry to `LEVELS` in `levels/levels.ts`:

```ts
{
  id: 41, name: 'Suya Spot', region: 'carnival', difficulty: 'hard',
  moves: 26, foods: [J, D, P, A, S, M],
  layout: ['........', '.cc..cc.', /* ... 8 rows, see legend */],
  goals: [clear('crate'), collect(S, 25)],
  stars: [5000, 9000, 13000],
  reward: { coins: 100 },
}
```

Layout legend: `.` food · `#` restricted · `b` basket · `c`/`C` crate (2/3 hits) · `w`/`W` wrap (1/2) · `o`/`O` oil (1/2) · `x` wrap on oil · `h`/`v` pre-placed rocket · `j` blast · `f` Suya Fire.

Then run `npm run simulate -- 41 41 100` to check its win rate and get suggested star thresholds. `npm test` fails if any level can't be won.

## Testing

- `tests/engine.test.ts`: generation (no starting matches, always a valid move), match detection, swaps and reverts, gravity and refill, every special and combo, obstacles, boosters, goals, win/loss, dead-board shuffling, and a random-play invariant sweep.
- `tests/progress.test.ts`: save validation and corrupted-save recovery, level unlocking, rewards paid once, progress surviving a reload, daily rewards once per day, deterministic daily challenge.
- `tests/controller.test.ts`: whole levels played through the animation controller with fake timers. After every move the view must exactly match the engine, input must be locked while resolving, and disposing must leave no timers running.
- `tests/levels.test.ts`: level data is well formed, mechanics are introduced in order, and every level and 30 days of daily challenges are winnable by the bot.
- `tests/vatar.test.ts`: the Vatar adapter against a fake SDK. Covers a missing SDK, `not_framed`, init called once, score merging, the 20 s limit, retrying `too_soon`, dropping invalid scores, leaderboard caching and bad rows, and pause/resume. For purchases it covers buy → server check → coins, a cancelled sheet, payment errors, retries while the server is down, a purchase remembered for the next visit, restoring through `purchases()`, `onPurchase`, and never claiming twice.
- `tests/claim.test.ts`: the purchase server against a fake Vatar API. Covers verify → check → deliver, using the right key for each mode, refusing a missing or wrong key, bad requests, another player's, refunded or unknown purchases (never delivered), every documented API error, keeping secrets out of the logs, and matching the game's coin pack list.
- `tests/deploy.test.ts`: the exact `frame-ancestors` origins, no `X-Frame-Options`, the documented SDK tag placed before the game script, no secret keys anywhere in the code, secrets never read through Vite, purchase ids in the save, and the leaderboard score.

## Limitations

- Progress is saved on this device only, so two LagosLife accounts on one phone share a save. There is no account sync or multiplayer. The storage adapter is the hook for adding sync. The leaderboard is online through LagosLife.
- Bought coins are kept in the device save like all progress. Clearing the browser's data or using **Reset progress** loses them. The reset warning says so once the player has bought coins.
- The daily reward and challenge use the device's local date, so changing the clock can unlock them early.
- Difficulty is tuned with a greedy bot. Real players may find some levels easier or harder than the labels suggest.
