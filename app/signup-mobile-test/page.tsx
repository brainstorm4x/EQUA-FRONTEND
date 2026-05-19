'use client';

/**
 * Experimental mobile-browser signup harness.
 *
 * Goal: prove that the wallet connect + sign + send round-trip is reliable on
 * Chrome mobile via Mobile Wallet Adapter v2, which uses Android intents
 * (replacing MWA v1's local WebSocket that died on tab background — see commit
 * d4b7769). If this primitive works end-to-end across cold-start and a
 * foreground/background cycle, MWA can be promoted into the global
 * MobileExternalWalletProvider so /mint signup just works.
 *
 * Scope intentionally tight: a 0-lamport self-transfer is enough to exercise
 * the exact transaction-signing primitive mobileRegister() relies on. The full
 * registration flow (PDAs, Anchor, referrals, ATA creation) is reachable from
 * /mint once the primitive is proven — duplicating it here would just diverge.
 *
 * Route /signup-mobile-test is wired through WalletProvider so that mobile
 * browsers reaching this URL load MobileExternalWalletProviderMWA instead of
 * the empty-adapters provider used everywhere else. All other routes are
 * unchanged.
 */

import { FC, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { SolanaMobileWalletAdapterWalletName } from '@solana-mobile/wallet-adapter-mobile';
import {
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  detectWalletEnvironment,
  type WalletEnvironment,
} from '@/utils/walletEnvironment';

type SmokeResult =
  | { kind: 'idle' }
  | { kind: 'building' }
  | { kind: 'sending' }
  | { kind: 'confirming'; signature: string }
  | { kind: 'success'; signature: string }
  | { kind: 'error'; message: string };

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as Mac with touch
  return ua.includes('Macintosh') && 'ontouchend' in document;
}

export default function SignupMobileTestPage() {
  const [env, setEnv] = useState<WalletEnvironment | null>(null);
  const [ua, setUa] = useState<string>('');
  const [iosFallback, setIosFallback] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setEnv(detectWalletEnvironment());
    setUa(navigator.userAgent);
    setIosFallback(isIos());
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 px-4 py-10">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Mobile Signup Test
          </h1>
          <p className="text-purple-200 text-sm">
            Diagnostic harness for Mobile Wallet Adapter v2 on external mobile browsers.
          </p>
        </header>

        <DiagnosticBanner env={env} ua={ua} />

        {env === 'mobile-browser' && iosFallback ? (
          <IosFallback />
        ) : (
          <MwaConnectAndSmokeTest />
        )}

        <footer className="text-center pt-4 border-t border-purple-500/30">
          <Link
            href="/"
            className="text-purple-300 hover:text-white text-sm underline"
          >
            ← Back to home
          </Link>
        </footer>
      </div>
    </main>
  );
}

const DiagnosticBanner: FC<{ env: WalletEnvironment | null; ua: string }> = ({ env, ua }) => {
  const { wallet, wallets, connected, connecting, publicKey } = useWallet();
  const mwaRegistered = useMemo(
    () =>
      wallets.some(
        (w) => w.adapter.name === SolanaMobileWalletAdapterWalletName,
      ),
    [wallets],
  );

  return (
    <section className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-purple-500/30 text-sm">
      <h2 className="text-white font-semibold mb-3">Environment</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-purple-200">
        <dt>WalletEnvironment</dt>
        <dd className="font-mono text-white">{env ?? 'detecting…'}</dd>

        <dt>MWA adapter registered</dt>
        <dd className="font-mono text-white">{String(mwaRegistered)}</dd>

        <dt>Adapter count</dt>
        <dd className="font-mono text-white">{wallets.length}</dd>

        <dt>Selected wallet</dt>
        <dd className="font-mono text-white">{wallet?.adapter.name ?? 'none'}</dd>

        <dt>connected / connecting</dt>
        <dd className="font-mono text-white">
          {String(connected)} / {String(connecting)}
        </dd>

        <dt>publicKey</dt>
        <dd className="font-mono text-white break-all">
          {publicKey?.toBase58() ?? 'none'}
        </dd>

        <dt>userAgent</dt>
        <dd className="font-mono text-white break-all">{ua || '—'}</dd>
      </dl>
    </section>
  );
};

const IosFallback: FC = () => {
  const [phantomHref, setPhantomHref] = useState<string>('#');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const ref = window.location.origin;
    setPhantomHref(
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`,
    );
  }, []);

  return (
    <section className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
      <h2 className="text-white font-semibold mb-2">iOS detected</h2>
      <p className="text-purple-200 text-sm mb-4">
        Solana Mobile Wallet Adapter is Android-only. On iOS, the closest working
        path is to re-open this URL inside Phantom&apos;s in-app browser, where
        the existing in-app wallet flow takes over.
      </p>
      <a
        href={phantomHref}
        className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-5 rounded-xl"
      >
        Open in Phantom (iOS)
      </a>
    </section>
  );
};

const MwaConnectAndSmokeTest: FC = () => {
  const { connection } = useConnection();
  const { wallet, wallets, select, connect, disconnect, connected, connecting, publicKey, sendTransaction } = useWallet();
  const [result, setResult] = useState<SmokeResult>({ kind: 'idle' });
  const [connectError, setConnectError] = useState<string | null>(null);

  const mwaAdapter = useMemo(
    () =>
      wallets.find(
        (w) => w.adapter.name === SolanaMobileWalletAdapterWalletName,
      ),
    [wallets],
  );

  const handleConnect = async () => {
    setConnectError(null);
    try {
      if (mwaAdapter) {
        select(SolanaMobileWalletAdapterWalletName);
        await new Promise((r) => setTimeout(r, 50));
        await connect();
        return;
      }
      // Desktop / mobile-inapp fallback — let the user pick from whatever
      // adapters wallet-standard auto-detected.
      const standard = wallets[0];
      if (!standard) {
        setConnectError('No wallet adapter available in this environment.');
        return;
      }
      select(standard.adapter.name as WalletName);
      await new Promise((r) => setTimeout(r, 50));
      await connect();
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name === 'WalletNotReadyError') {
        // Expected on first tap when MWA triggers the Android intent.
        return;
      }
      setConnectError(e?.message ?? 'Unknown connect error');
    }
  };

  const runSmokeTest = async () => {
    if (!publicKey || !sendTransaction) {
      setResult({ kind: 'error', message: 'Wallet not ready.' });
      return;
    }
    setResult({ kind: 'building' });
    try {
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0,
        }),
      );

      setResult({ kind: 'sending' });
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });

      setResult({ kind: 'confirming', signature });
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed',
      );
      setResult({ kind: 'success', signature });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setResult({
        kind: 'error',
        message: e?.message ?? 'Unknown smoke-test error',
      });
    }
  };

  return (
    <section className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 flex flex-col gap-4">
      <h2 className="text-white font-semibold">Wallet round-trip</h2>

      {!connected ? (
        <>
          <p className="text-purple-200 text-sm">
            Tap to connect. On Android Chrome with a wallet installed, this
            launches the wallet via an Android intent (MWA v2). On desktop it
            uses whatever Wallet Standard adapter auto-registered.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-5 rounded-xl"
          >
            {connecting ? 'Connecting…' : mwaAdapter ? 'Connect with Mobile Wallet' : 'Connect Wallet'}
          </button>
          {connectError && (
            <p className="text-red-300 text-sm">{connectError}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-purple-200 text-sm">
            Connected as{' '}
            <span className="font-mono text-white break-all">
              {publicKey?.toBase58()}
            </span>{' '}
            via{' '}
            <span className="font-mono text-white">
              {wallet?.adapter.name}
            </span>
            .
          </p>

          <button
            onClick={runSmokeTest}
            disabled={result.kind === 'building' || result.kind === 'sending' || result.kind === 'confirming'}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-5 rounded-xl"
          >
            {labelForResult(result)}
          </button>

          <SmokeResultView result={result} />

          <div className="flex gap-3 pt-2">
            <button
              onClick={disconnect}
              className="flex-1 text-purple-200 hover:text-white text-sm underline"
            >
              Disconnect
            </button>
            <Link
              href="/mint"
              className="flex-1 text-center text-purple-200 hover:text-white text-sm underline"
            >
              Go to /mint →
            </Link>
          </div>
          <p className="text-purple-400 text-xs">
            Note: /mint uses the global wallet provider, not the MWA override.
            Promote MWA into <code>MobileExternalWalletProvider</code> once this
            smoke test is reliable.
          </p>
        </>
      )}
    </section>
  );
};

function labelForResult(result: SmokeResult): string {
  switch (result.kind) {
    case 'building':
      return 'Building transaction…';
    case 'sending':
      return 'Awaiting wallet signature…';
    case 'confirming':
      return 'Confirming on devnet…';
    case 'success':
      return 'Run smoke test again';
    case 'error':
      return 'Retry smoke test';
    case 'idle':
    default:
      return 'Run smoke test (0-lamport self-transfer)';
  }
}

const SmokeResultView: FC<{ result: SmokeResult }> = ({ result }) => {
  if (result.kind === 'idle' || result.kind === 'building') return null;

  if (result.kind === 'error') {
    return (
      <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-3 text-sm text-red-200 break-words">
        ❌ {result.message}
      </div>
    );
  }

  const sig =
    result.kind === 'confirming' || result.kind === 'success'
      ? result.signature
      : null;

  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-sm text-green-100 break-words">
      {result.kind === 'sending' && '📤 Submitted to wallet, waiting for signature return…'}
      {result.kind === 'confirming' && (
        <>
          ⏳ Confirming…
          <br />
          <span className="font-mono text-xs break-all">{sig}</span>
        </>
      )}
      {result.kind === 'success' && sig && (
        <>
          ✅ Confirmed on devnet.
          <br />
          <a
            href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-mono text-xs break-all"
          >
            {sig}
          </a>
        </>
      )}
    </div>
  );
};
