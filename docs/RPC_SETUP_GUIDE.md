# UNIYAA low-cost reads: step-by-step setup

This replaces the old plan of running PCs and microcontrollers (UNIYAA and
UNIYAA-MCU, both discarded). Instead:

1. **Shared numbers** (the price, user count, transaction counter: the
   on-chain `GlobalState` account) are read **once every 10 seconds by
   Netlify**, then served from Netlify's cache to every visitor. A thousand
   visitors cost the same RPC reads as one.
2. **Personal data** (a user's balance and account) and **transactions**
   (register, mint, send) still go from the user's browser or phone straight
   to a Solana RPC provider. The user's wallet signs and pays the network fee.
3. **Exchange rates** are fetched once an hour by a Netlify scheduled
   function and cached.

Nothing here needs a computer of yours to stay switched on.

---

## Part 0: Words used in this guide

| Word | Meaning |
|---|---|
| **RPC** | The web address apps use to talk to the Solana blockchain. |
| **RPC provider** | A company that runs that address for you (Helius, QuickNode, Triton...). The public `api.devnet.solana.com` is free but slow and limited. |
| **API key** | A password inside the RPC address, e.g. `https://devnet.helius-rpc.com/?api-key=abc123`. Anyone who has it can spend your credits. |
| **Environment variable** | A named setting stored in Netlify (or GitHub), read by the code at build or run time, so secrets never go into the code. |
| **Netlify function** | A small piece of code Netlify runs on its servers when an address like `/.netlify/functions/get-global-state` is opened. |
| **CDN cache** | Netlify keeps a copy of a function's answer for a few seconds and hands that copy to everyone instead of running the function again. |

---

## Part 1: What is already running (no action needed)

Checked on 2026-10-09:

- Website: <https://uniyaatoken.netlify.app> (Netlify project `uniyaatoken`).
- Cached shared numbers: <https://uniyaatoken.netlify.app/.netlify/functions/get-global-state>
  answers `200`, and Netlify reports it is served from cache (`hit`).
- Exchange rates: <https://uniyaatoken.netlify.app/.netlify/functions/get-fx-rates>
  answers `200`.
- The Android app reads the same two addresses.

Everything still uses the **free public devnet RPC**. That is fine for
testing. Parts 2-5 are what to do so it keeps working when real users arrive,
and before mainnet.

---

## Part 2: Check your Netlify plan and usage (10 minutes)

Netlify's free plan now works with **credits**: 300 a month, and **when they
run out the site stops** until the next month. Every **production deploy
costs about 15 credits**, so merging a pull request to `main` ~20 times in a
month can use the whole allowance by itself. Bandwidth and function calls
take credits too.

1. Open <https://app.netlify.com> and log in.
2. Click the project **uniyaatoken**.
3. In the left menu click **Usage & billing** (on some accounts it is under
   your team name → **Billing**).
4. Write down:
   - the plan name (Free, Personal, Pro, or a "legacy" plan),
   - credits used this month and the reset date.
5. If you see "Credits" and you are above half before mid-month:
   - Batch changes: merge several pull requests, then deploy once.
   - Or consider the Personal plan (paid) before launch.
6. Optional but recommended: in **Usage & billing**, turn on email alerts for
   usage, if the option is shown.

> Deploy previews (the test links pull requests get) do **not** cost credits.
> Only deploys to the live site do.

---

## Part 3: Get your own RPC key (Helius, free plan) (15 minutes)

The free plan gives 1 million credits a month at 10 requests per second, with
no card needed. Make **three keys**, one per place they are used, so each can
be locked down differently.

### 3.1 Create the account

1. Open <https://dashboard.helius.dev> and sign up (email or GitHub).
2. Choose the **Free** plan. Do not enter card details.

### 3.2 Create the keys

1. In the dashboard open **API Keys** (left menu).
2. Click **New Key** (or **Create API Key**). Name it `uniyaa-website`.
3. Repeat for `uniyaa-server` and `uniyaa-app`.

### 3.3 Copy the devnet addresses

For each key the dashboard shows RPC URLs. Pick **Devnet** and copy the
HTTPS URL. It looks like:

```
https://devnet.helius-rpc.com/?api-key=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

Paste the three URLs into a password manager or a private note, labelled
with the key name. **Never paste them into chat, GitHub issues or code.**

### 3.4 Lock each key down

Open each key → **Access Control** (or **Settings → Access Control Rules**):

| Key | Rule to add | Why |
|---|---|---|
| `uniyaa-website` | **Allowed Domains**: `uniyaatoken.netlify.app` and `*--uniyaatoken.netlify.app` (preview links) | This key is visible to anyone who opens the site; the rule stops other sites using it. |
| `uniyaa-server` | No domain rule (Netlify servers send no domain). Never put it in a `NEXT_PUBLIC_` variable. | Only Netlify sees it. |
| `uniyaa-app` | No domain rule is possible (phones send no domain). If the dashboard offers a **Secure RPC URL** (rate-limited, key hidden) use that URL for the app instead. | Anyone can unpack an APK, so assume this key is public. |

If you are unsure a domain rule works, test it in Part 6 straight after.

---

## Part 4: Put the keys into Netlify (website) (10 minutes)

1. <https://app.netlify.com> → **uniyaatoken** → **Project configuration**
   (or **Site configuration**) → **Environment variables**.
2. Click **Add a variable** → **Add a single variable**.
3. Add these (one at a time). For each, keep **Scopes: All** and
   **Deploy contexts: Same value for all**:

| Key | Value | Note |
|---|---|---|
| `NEXT_PUBLIC_RPC_ENDPOINT` | the `uniyaa-website` devnet URL | Used by browsers. Domain-locked in 3.4. |
| `SOLANA_RPC_URL` | the `uniyaa-server` devnet URL | Used only by the cached GlobalState function. Needs EQUA-FRONTEND PR #328 merged. |
| `NEXT_PUBLIC_NETWORK` | `devnet` | Already defaulted; set it so it is explicit. |

4. Check these exist (they are needed for exchange rates and the APK
   download; the site works today, so they are probably set). Do **not**
   change them if present:
   - `NETLIFY_SITE_ID`, `NETLIFY_ACCESS_TOKEN`
   - `APK_GITHUB_TOKEN`
   - `EXCHANGERATE_API_KEY` (optional; a free fallback is used without it)
5. Environment variables only take effect on the **next deploy**: go to
   **Deploys** → **Trigger deploy** → **Deploy site**. (This costs one
   deploy's credits.)

---

## Part 5: Put the key into the Android app build (10 minutes)

Needs equa_flutter_app PR #124 merged.

1. Open <https://github.com/brainstorm4x/equa_flutter_app>.
2. **Settings** (top tab) → left menu **Secrets and variables** → **Actions**.
3. Click **New repository secret**.
   - Name: `UNIYAA_RPC_URL`
   - Secret: the `uniyaa-app` devnet URL (or the Secure RPC URL).
4. Click **Add secret**.
5. The next APK build (every merge to `main`, or **Actions** →
   **Android APK** → **Run workflow**) uses it. Without the secret the app
   keeps using the public devnet RPC.
6. On your phone: uninstall UNIYAA first, then install the new APK from the
   website. (Each build is signed differently; installing over the old one
   fails silently.)

---

## Part 6: Check it works (10 minutes)

1. **Cached numbers.** Open
   <https://uniyaatoken.netlify.app/.netlify/functions/get-global-state>.
   You should see text starting `{"address":` with a `slot` number. Refresh
   after 15 seconds: `slot` should go up.
2. **Website reads.** Open <https://uniyaatoken.netlify.app>, connect your
   wallet, check your balance shows. Then in Helius → **Usage**, the
   `uniyaa-website` key should show requests within a few minutes.
3. **Domain lock.** In Helius usage, look for errors on `uniyaa-website`. If
   the website shows no balance after Part 4, the domain rule is too strict:
   loosen it, and redeploy.
4. **App.** Open the app, check the balance and price load. The
   `uniyaa-app` key should show requests.
5. **Server key.** `uniyaa-server` should show a small, steady number of
   requests (about one per 10 seconds while people use the site), not one
   per visitor.

---

## Part 7: Watch the costs (5 minutes a week)

| Where | What to look at | Worry if |
|---|---|---|
| Netlify → Usage & billing | Credits used | Over half before mid-month |
| Helius → Usage | Credits per key | Any key heading past 1 million a month |
| Helius → Usage | Requests by method | One method suddenly dominates (a bug or abuse) |

If a key is abused: Helius → that key → **Regenerate** (or delete and make a
new one), then update the matching Netlify variable or GitHub secret and
redeploy / rebuild.

---

## Part 8: Moving to mainnet (later)

Do this only after the items in EQUA `docs/MAINNET_CHECKLIST.md`
(identity verification, new program ID, keys) are done.

1. In Helius, copy the **Mainnet** URL of each key (same keys, different
   address: `https://mainnet.helius-rpc.com/?api-key=...`).
2. Update `NEXT_PUBLIC_RPC_ENDPOINT` and `SOLANA_RPC_URL` in Netlify,
   set `NEXT_PUBLIC_NETWORK` to `mainnet-beta`, set `NEXT_PUBLIC_PROGRAM_ID`
   to the new program ID, and redeploy.
3. Update the `UNIYAA_RPC_URL` GitHub secret; the app's program ID and
   network (`lib/config/constants.dart`) also need changing in code.
4. Re-check Part 6 on mainnet with a tiny amount first.
5. Expect to need a paid Helius plan once real users arrive; Part 7's
   numbers will tell you when.

---

## Quick reference

| Setting | Where | Value |
|---|---|---|
| `NEXT_PUBLIC_RPC_ENDPOINT` | Netlify env | website key URL |
| `SOLANA_RPC_URL` | Netlify env | server key URL |
| `NEXT_PUBLIC_NETWORK` | Netlify env | `devnet` (later `mainnet-beta`) |
| `UNIYAA_RPC_URL` | GitHub → equa_flutter_app → Actions secrets | app key URL |
| Cache time | `netlify/functions/get-global-state.ts` | 10 s fresh, 30 s stale-while-refreshing |
| FX refresh | `netlify.toml` | hourly |
