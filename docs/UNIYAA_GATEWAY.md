# UNIYAA Mesh Gateway — Frontend Cut-Over (M13)

This frontend can talk to a local **UNIYAA mesh gateway** instead of a public devnet RPC. The gateway behaves as a drop-in replacement for `api.devnet.solana.com`: cached read methods (`getBalance` / `getAccountInfo` / `getMultipleAccounts`) are served from local mesh state and shared across peers; everything else passes through to a configured upstream.

This is the M13 cut-over from the UNIYAA edge-infrastructure build plan.

## Why route through the gateway?

- **Mesh-cached reads.** Account info you've fetched before (and account info other peers in your mesh have fetched) is served locally — no round-trip to the upstream RPC for repeat queries.
- **Multi-source verification.** When multiple peers have observed the same account, disagreements are surfaced rather than silently picking one answer. (See `crates/uniyaa-network/src/cache/verifier.rs` in the UNIYAA repo.)
- **No commercial-RPC dependency in the production path.** The UNIYAA architecture's long-term goal is many self-hosted Solana / Geyser sources behind validator-connected peers, not one rate-limited provider.

## How to enable it

### Step 1 — start the UNIYAA node

`uniyaa-cli` is a Rust binary inside the UNIYAA workspace; it is **not** on your `PATH` by default. You must invoke it via `cargo run` from the workspace root (NOT from `crates/uniyaa-cli/` — `-p uniyaa-cli` tells cargo which workspace member to build):

```bash
cd ~/dreamwork/UNIYAA
cargo run --release -p uniyaa-cli -- start \
  --config node_config.toml \
  --identity node_identity.json \
  --rpc-listen 127.0.0.1:7788 \
  --validator-rpc-upstream https://api.devnet.solana.com
```

Notes:

- The first run compiles the release binary (~2 minutes). Subsequent runs are instant.
- The `--` separator is required — it tells cargo "everything after this is for the binary, not for cargo."
- `node_config.toml` + `node_identity.json` live at the UNIYAA repo root; both are tracked in git.
- The default `node_config.toml` lists unreachable bootstrap seeds (`seed1.uniyaa.network:7447` etc.). You'll see "Bootstrap seed queued" lines and dial-failure warnings — **that's expected and harmless** for local-gateway use; the RPC server is independent of mesh dial-out.

Once you see these three lines the gateway is ready:

```
M11 RPC: validator-connected (laptop tier) ... passthrough=true
uniyaa-api JSON-RPC server listening listen=127.0.0.1:7788 ...
UNIYAA QUIC server listening on 0.0.0.0:7447 ...
```

**Optional convenience:** to put the binary on your `PATH` so you can just type `uniyaa-cli start ...` from anywhere:

```bash
cd ~/dreamwork/UNIYAA
cargo install --path crates/uniyaa-cli
```

### Step 2 — point the frontend at the gateway

In `.env.local`:

```bash
NEXT_PUBLIC_RPC_ENDPOINT=http://127.0.0.1:7788
NEXT_PUBLIC_NETWORK=devnet
```

### Step 3 — run the frontend

```bash
npm run dev
```

**Restart the dev server after any `.env.local` change** — Next.js loads env vars at startup; an already-running dev server keeps serving stale values.

The standard `@solana/web3.js` `Connection` works unchanged — every method either hits a fast cached path inside UNIYAA or transparently passes through to the upstream you configured.

## Tier semantics (important)

The gateway has two operating modes depending on how the node is started:

| Mode                                           | `--validator-rpc-upstream` set? | Behavior on unknown method                    | Recommended for                |
| ---------------------------------------------- | ------------------------------- | --------------------------------------------- | ------------------------------ |
| **Full-power (SBC / N100 / server / laptop)**  | yes                             | passthrough to upstream (drop-in replacement) | this frontend                  |
| **Phone tier (Termux)**                        | no                              | `-32601 MethodNotFound` (honest no-fallback)  | UNIYAA-native apps that handle it |

For this frontend you want the full-power mode. The phone mode is correct behavior for a UNIYAA-native app that already knows which methods are cacheable and would handle a `MethodNotFound` itself — but `@solana/web3.js` does not, and will throw.

**Dedicated SBCs (Pi 4 / 5 / Orange Pi etc.) are the intended mesh backbone, not laptops.** A laptop works fine for dev / casual operation; the production deployment target is always-on low-power SBCs. See `docs/DEPLOYMENT_TIERS.md` in the UNIYAA repo (`~/dreamwork/UNIYAA/docs/`) for the full hardware-tier story.

## Verification checklist

Walk through this in a real browser once after pointing `NEXT_PUBLIC_RPC_ENDPOINT` at the gateway. Headless dev startup is clean; the browser-runtime path is the part only a real browser exercises.

**Startup signals (without any wallet activity):**

1. `npm run dev` reports `✓ Ready` with no module-resolution errors (`Module not found` would be a code-level bug — none known as of 2026-05-26 after the IDL-path + Program-ID fixes).
2. Browser → `localhost:3000` loads to HTTP 200 with no SSR errors in the dev-server terminal.
3. UNIYAA gateway log shows:
   - `uniyaa-api JSON-RPC server listening` on startup.
   - `M11 RPC: validator-connected … passthrough = true` on startup.

**With a wallet connected:**

4. Network tab in browser dev tools: requests go to `http://127.0.0.1:7788`, NOT `api.devnet.solana.com`.
5. UNIYAA gateway log shows per-account-info flow:
   - `validator-connected: fetched + cached getAccountInfo` on the first lookup per account.
   - `validator-connected: local/witness hit, no upstream needed` on subsequent same-account lookups.
   - `validator-connected: passthrough (uncached)` for `sendTransaction`, `getLatestBlockhash`, `getProgramAccounts`, etc.
6. UI populates: balance reads, account state, transaction sends all work.

If wallet flows fail with `-32601 MethodNotFound`, check that you started the node with `--validator-rpc-upstream` set; without it, the gateway has nothing to fall back to.

## Known browser-console limitations (informational; not blockers)

These appear in the browser console when running against the UNIYAA gateway. They are NOT errors in the cut-over — the underlying functionality works — but if you're triaging real bugs alongside them, knowing they're harmless saves time.

| Symptom                                              | Cause                                                                                  | Fix                                                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ws error: undefined` (sometimes many)               | `@solana/web3.js` opens a WebSocket to the same host as the HTTP RPC for `onAccountChange` subscriptions. UNIYAA gateway is JSON-RPC over HTTP only — no WS endpoint. web3.js falls back to polling automatically; the failed-connection log lines are cosmetic. | Future: add WebSocket subscriptions to `uniyaa-api`. Out of scope for M13; would be its own milestone (M11.6-ish — subscription gossip is non-trivial because state changes need to fan out across mesh peers, not just one server). |
| `404 /.netlify/functions/get-fx-rates`               | Netlify functions don't run under `next dev`. The frontend's FX-rate client tries the Netlify endpoint first then falls back to static defaults. | None needed; the static fallback rates are correct for the dev path.                                    |
| `[browser] Error fetching ... TypeError: Failed to fetch` (during initial render) | Brief race: the page mounts before the wallet adapter resolves, so the connection's first request fires before the gateway URL is finalized. Re-fetches on next render succeed. | None needed; resolves on its own within ~1s. If persistent, check that `NEXT_PUBLIC_RPC_ENDPOINT` is set + the dev server was restarted after the `.env.local` change. |

## Reverting

Either unset `NEXT_PUBLIC_RPC_ENDPOINT` (it defaults back to `https://api.devnet.solana.com`) or stop the UNIYAA node. The frontend has no other coupling to UNIYAA — pointing the env var elsewhere immediately restores upstream-only behavior.
