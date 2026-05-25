# UNIYAA Mesh Gateway — Frontend Cut-Over (M13)

This frontend can talk to a local **UNIYAA mesh gateway** instead of a public devnet RPC. The gateway behaves as a drop-in replacement for `api.devnet.solana.com`: cached read methods (`getBalance` / `getAccountInfo` / `getMultipleAccounts`) are served from local mesh state and shared across peers; everything else passes through to a configured upstream.

This is the M13 cut-over from the UNIYAA edge-infrastructure build plan.

## Why route through the gateway?

- **Mesh-cached reads.** Account info you've fetched before (and account info other peers in your mesh have fetched) is served locally — no round-trip to the upstream RPC for repeat queries.
- **Multi-source verification.** When multiple peers have observed the same account, disagreements are surfaced rather than silently picking one answer. (See `crates/uniyaa-network/src/cache/verifier.rs` in the UNIYAA repo.)
- **No commercial-RPC dependency in the production path.** The UNIYAA architecture's long-term goal is many self-hosted Solana / Geyser sources behind validator-connected peers, not one rate-limited provider.

## How to enable it

1. **Run a UNIYAA node** (laptop tier — has a real upstream wired in).

   From `~/dreamwork/UNIYAA/`:

   ```bash
   cargo run -p uniyaa-cli --release -- start \
     --config node_config.toml \
     --identity node_identity.json \
     --rpc-listen 127.0.0.1:7788 \
     --validator-rpc-upstream https://api.devnet.solana.com
   ```

   This brings up:
   - The mesh QUIC peer on whatever `listen_addr` your `node_config.toml` says.
   - A Solana-compatible JSON-RPC server on `http://127.0.0.1:7788`.

2. **Point the frontend at it.** In `.env.local`:

   ```bash
   NEXT_PUBLIC_RPC_ENDPOINT=http://127.0.0.1:7788
   NEXT_PUBLIC_NETWORK=devnet
   ```

3. **Run the frontend normally.**

   ```bash
   npm run dev
   ```

The standard `@solana/web3.js` `Connection` works unchanged — every method either hits a fast cached path inside UNIYAA or transparently passes through to the upstream you configured.

## Tier semantics (important)

The gateway has two operating modes depending on how the node is started:

| Mode                         | `--validator-rpc-upstream` set? | Behavior on unknown method                    | Recommended for                |
| ---------------------------- | ------------------------------- | --------------------------------------------- | ------------------------------ |
| **Laptop / SBC (M13 mode)**  | yes                             | passthrough to upstream (drop-in replacement) | this frontend                  |
| **Phone (M11 phone tier)**   | no                              | `-32601 MethodNotFound` (honest no-fallback)  | a future Termux / Android peer |

For this frontend you want the laptop mode. The phone mode is correct behavior for a UNIYAA-native app that already knows which methods are cacheable and would handle a `MethodNotFound` itself — but `@solana/web3.js` does not, and will throw.

## Verification

A successful cut-over looks like:

1. The browser console no longer reports requests to `api.devnet.solana.com`. They all go to `http://127.0.0.1:7788`.
2. The UNIYAA node log shows:
   - `uniyaa-api JSON-RPC server listening` on startup.
   - `M11 RPC: validator-connected … passthrough = true` on startup.
   - `validator-connected: fetched + cached getAccountInfo` on the first lookup per account; subsequent lookups for the same account skip the upstream fetch (`local/witness hit, no upstream needed`).
   - `validator-connected: passthrough (uncached)` for `sendTransaction`, `getLatestBlockhash`, `getProgramAccounts`, etc.

If wallet flows fail with `-32601 MethodNotFound`, check that you started the node with `--validator-rpc-upstream` set; without it, the gateway has nothing to fall back to.

## Reverting

Either unset `NEXT_PUBLIC_RPC_ENDPOINT` (it defaults back to `https://api.devnet.solana.com`) or stop the UNIYAA node. The frontend has no other coupling to UNIYAA — pointing the env var elsewhere immediately restores upstream-only behavior.
