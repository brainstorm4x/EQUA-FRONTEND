'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

// ============================================================================
// Types
// ============================================================================

interface PerformanceRow {
  timestamp: number;
  recordedAt: string;
  uniyaaPriceUsd: number;
  uniyaaPriceLocal: number | null;
  unxPriceUsd: number;
  usdInflationIndex: number;
  uniyaaPurchasingPower: number;
  source: string;
  // "$100 held" comparison fields (added by get-performance-data).
  // unxHoldingValue tracks the UNX basket — the actual hedging instrument.
  unxHoldingValue: number;
  usdHoldingValue: number;
  advantagePerHundred: number;
}

interface PerformanceSummary {
  unxPriceChange: number;
  unxPriceChangePercent: number;
  usdPurchasingPowerLoss: number;
  unxVsUsdAdvantage: number;
  currentUniyaaPriceUsd: number;
  currentUniyaaPriceLocal: number | null;
  currentUnxPriceUsd: number;
  dataPoints: number;
  // "$100 held" comparison fields
  unxHoldingValue: number;
  usdHoldingValue: number;
  advantagePerHundred: number;
  holdingPeriodLabel: string;
}

interface PerformanceResponse {
  data: PerformanceRow[];
  summary: PerformanceSummary;
  currency: string;
  from: string;
  to: string;
  interval: string;
  supportedCurrencies: string[];
}

// ============================================================================
// Constants
// ============================================================================

const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'KRW', 'BRL',
  'MXN', 'AUD', 'CAD', 'CHF', 'NGN', 'ZAR', 'AED', 'SGD',
];

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';
type Interval = 'hourly' | 'daily';

/**
 * UNX basket composition — kept in lockstep with BASKET_COMPONENTS in
 * netlify/functions/lib/unxOracle.ts (which is the single source of truth
 * read by the on-chain oracle updater). Ordered largest weight first.
 */
const UNX_BASKET = [
  { name: 'Gold (XAU)',      pct: 35, color: '#fbbf24' /* amber-400 */, note: 'inflation hedge' },
  { name: 'USD',             pct: 23, color: '#4ade80' /* green-400 */, note: 'liquidity' },
  { name: 'Euro (EUR)',      pct: 17, color: '#60a5fa' /* blue-400 */,  note: 'reserve FX' },
  { name: 'Yuan (CNH)',      pct:  9, color: '#f87171' /* red-400 */,   note: 'Asian FX' },
  { name: 'Oil',             pct:  8, color: '#1f2937' /* slate-800 */, note: 'energy' },
  { name: 'Yen (JPY)',       pct:  5, color: '#a78bfa' /* violet-400 */, note: 'reserve FX' },
  { name: 'Sterling (GBP)',  pct:  3, color: '#f472b6' /* pink-400 */,  note: 'reserve FX' },
] as const;

// ============================================================================
// Utility helpers
// ============================================================================

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + n.toFixed(6);
}

function fmtLocal(n: number | null | undefined, currency: string): string {
  if (n == null) return '—';
  return n.toFixed(6) + ' ' + currency;
}

function fmtUnx(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + n.toFixed(2);
}

function fmtIndex(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toFixed(5);
}

function fmtHolding(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + n.toFixed(2);
}

function fmtAdvantage(n: number | null | undefined): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return sign + '$' + n.toFixed(2);
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

/**
 * Express a $-denominated holding value (baseline $100) as a percentage
 * change relative to that baseline. Keeps the math correct even if the
 * BASELINE_INVESTMENT_USD ever changes from 100 in the backend.
 */
function holdingValueToPct(holdingValue: number, baseline = 100): number {
  return ((holdingValue - baseline) / baseline) * 100;
}

function getRangeFrom(range: TimeRange): string | undefined {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    case 'all':
      return undefined;
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default function PerformancePage() {
  const [currency, setCurrency] = useState<string>('USD');
  // Default to 'all' (since genesis) so the CPI signal is large enough to be
  // visible — over a 30-day window CPI moves ~0.25 % which barely separates
  // from zero in the visual.
  const [range, setRange] = useState<TimeRange>('all');
  const [interval, setInterval] = useState<Interval>('daily');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PerformanceResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ currency, interval });

      const fromDate = getRangeFrom(range);
      if (fromDate) params.set('from', fromDate);

      const url = `/.netlify/functions/get-performance-data?${params.toString()}`;
      const res = await fetch(url);

      if (res.status === 503) {
        setError('Performance data is temporarily unavailable. Please try again later.');
        return;
      }

      if (!res.ok) {
        setError('Performance data is temporarily unavailable. Please try again later.');
        return;
      }

      const json: PerformanceResponse = await res.json();
      setResponse(json);
    } catch {
      setError('Performance data is temporarily unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currency, range, interval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = response?.summary;
  const data = response?.data ?? [];

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600">
      {/* Header */}
      <header className="border-b border-purple-700 bg-purple-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-white">UNIYAA Token</h1>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-purple-200 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/whitepaper" className="text-purple-200 hover:text-white transition-colors">
                Whitepaper
              </Link>
              <Link href="/merchants" className="text-purple-200 hover:text-white transition-colors">
                For Merchants
              </Link>
              <Link href="/about" className="text-purple-200 hover:text-white transition-colors">
                About
              </Link>
              <Link href="/privacy" className="text-purple-200 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/mint" className="text-purple-200 hover:text-white transition-colors">
                Mint
              </Link>
              <Link href="/performance" className="text-white font-semibold border-b-2 border-yellow-400 pb-0.5">
                Performance
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Hero */}
          <div className="text-center mb-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">UNX vs USD</h2>
            <p className="text-purple-300 text-lg">
              How the UNX basket (35% gold, 30% FX ex-USD, 8% oil, 23% USD) holds value as the dollar erodes
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30 flex flex-wrap items-center gap-6">
            {/* Currency selector */}
            <div className="flex flex-col gap-1">
              <label className="text-purple-300 text-sm font-medium">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-purple-900/60 border border-purple-500/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Time range */}
            <div className="flex flex-col gap-1">
              <label className="text-purple-300 text-sm font-medium">Time Range</label>
              <div className="flex gap-1">
                {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRange(r);
                      // Hourly is only practical for 7d; auto-switch to daily for
                      // longer ranges to keep the data table manageable.
                      if (r !== '7d' && interval === 'hourly') setInterval('daily');
                      if (r === '7d') setInterval('hourly');
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      range === r
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/60 text-purple-200 hover:bg-purple-700/60'
                    }`}
                  >
                    {r === 'all' ? 'All' : r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Interval */}
            <div className="flex flex-col gap-1">
              <label className="text-purple-300 text-sm font-medium">Interval</label>
              <div className="flex gap-1">
                {(['hourly', 'daily'] as Interval[]).map((iv) => (
                  <button
                    key={iv}
                    onClick={() => setInterval(iv)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      interval === iv
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/60 text-purple-200 hover:bg-purple-700/60'
                    }`}
                  >
                    {iv.charAt(0).toUpperCase() + iv.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* UNX Basket Composition */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-1 text-center">Why UNX holds value</h3>
            <p className="text-purple-300 text-sm text-center mb-6">
              Each UNX is a weighted basket of seven assets
            </p>
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
              {/* Donut */}
              <div className="relative w-48 h-48 shrink-0">
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: (() => {
                      let acc = 0;
                      const stops = UNX_BASKET.map((c) => {
                        const s = `${c.color} ${acc}% ${acc + c.pct}%`;
                        acc += c.pct;
                        return s;
                      }).join(', ');
                      return `conic-gradient(${stops})`;
                    })(),
                  }}
                />
                <div className="absolute inset-0 m-auto flex flex-col items-center justify-center rounded-full bg-purple-900/90 w-24 h-24 top-12 left-12">
                  <span className="text-2xl">🪙</span>
                  <span className="text-purple-200 text-xs font-semibold">UNX</span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                {UNX_BASKET.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span
                      className="inline-block w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: c.color }}
                      aria-hidden
                    />
                    <span className="text-purple-100 text-sm font-mono w-10 text-right">{c.pct}%</span>
                    <span className="text-purple-200 text-sm">
                      {c.name} <span className="text-purple-400 text-xs">· {c.note}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-purple-300 text-sm mt-6 text-center">
              77% of UNX is denominated in non-USD assets that historically appreciate when the dollar
              weakens. The 23% USD weight provides liquidity without amplifying dollar risk.
            </p>
          </div>

          {/* $100 Held Hero Comparison Banner */}
          {summary && !loading && !error && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
              <p className="text-center text-purple-200 text-sm mb-1">
                $100 held as UNX vs $100 held as USD cash
              </p>
              <p className="text-center text-purple-400 text-xs mb-6">
                over the {summary.holdingPeriodLabel === 'today' ? 'last' : 'past'} {summary.holdingPeriodLabel}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* UNX card */}
                <div className={`rounded-xl p-5 border text-center ${
                  summary.unxHoldingValue >= 100
                    ? 'border-green-500/40 bg-green-900/20'
                    : 'border-red-500/40 bg-red-900/20'
                }`}>
                  <p className="text-purple-200 text-sm mb-1">🪙 $100 in UNX</p>
                  <p className="text-purple-300 text-xs mb-3">Market value today:</p>
                  <p className={`text-3xl font-bold ${
                    summary.unxHoldingValue >= 100 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {fmtHolding(summary.unxHoldingValue)}
                  </p>
                  <p className={`text-sm mt-1 ${
                    summary.unxHoldingValue >= 100 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {summary.unxHoldingValue >= 100 ? '▲' : '▼'}{' '}
                    {fmtPct(holdingValueToPct(summary.unxHoldingValue))}
                  </p>
                </div>

                {/* USD card */}
                <div className="rounded-xl p-5 border border-red-500/40 bg-red-900/20 text-center">
                  <p className="text-purple-200 text-sm mb-1">💵 $100 in USD cash</p>
                  <p className="text-purple-300 text-xs mb-3">Real purchasing power (per FRED CPI):</p>
                  <p className="text-3xl font-bold text-red-400">
                    {fmtHolding(summary.usdHoldingValue)}
                  </p>
                  <p className="text-sm mt-1 text-red-400">
                    ▼ {fmtPct(holdingValueToPct(summary.usdHoldingValue))}
                  </p>
                </div>
              </div>

              {/* Advantage summary */}
              <div className="text-center">
                <p className={`text-lg font-semibold ${
                  summary.advantagePerHundred >= 0 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  UNX preserved{' '}
                  <span className="font-bold">
                    {fmtAdvantage(summary.advantagePerHundred)}
                  </span>{' '}
                  {summary.advantagePerHundred >= 0 ? 'more' : 'less'} per $100 held
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-purple-300">Loading performance data…</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-red-500/30 text-center">
              <p className="text-red-300 text-lg">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && data.length === 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-purple-500/30 text-center">
              <p className="text-purple-200 text-lg">
                No performance data available yet. Data collection begins once the hourly price
                update function starts writing to the database.
              </p>
            </div>
          )}

          {/* Data Table */}
          {!loading && !error && data.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-purple-500/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-purple-500/30 bg-purple-900/40">
                      <th className="px-4 py-3 text-left text-purple-300 font-medium whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 text-right text-purple-300 font-medium whitespace-nowrap">$100 UNX →</th>
                      <th className="px-4 py-3 text-right text-purple-300 font-medium whitespace-nowrap">$100 USD (real)</th>
                      <th className="px-4 py-3 text-right text-purple-300 font-medium whitespace-nowrap">UNX Advantage</th>
                      <th className="px-4 py-3 text-right text-purple-300 font-medium whitespace-nowrap">UNX Basket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => {
                      const prev = idx > 0 ? data[idx - 1] : null;
                      // Color rows by whether the UNX advantage is growing or shrinking.
                      // First row has no comparison point — use neutral colour.
                      const advantageDelta =
                        prev != null
                          ? row.advantagePerHundred - prev.advantagePerHundred
                          : null;
                      const rowColor =
                        advantageDelta == null
                          ? idx % 2 === 0
                            ? ''
                            : 'bg-white/5'
                          : advantageDelta >= 0
                          ? idx % 2 === 0
                            ? 'bg-green-900/10'
                            : 'bg-green-900/20'
                          : idx % 2 === 0
                          ? 'bg-red-900/10'
                          : 'bg-red-900/20';

                      return (
                        <tr key={row.timestamp} className={`border-b border-purple-500/10 ${rowColor}`}>
                          <td className="px-4 py-3 text-purple-200 whitespace-nowrap">{fmtDate(row.recordedAt)}</td>
                          <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${
                            row.unxHoldingValue >= 100 ? 'text-green-400' : 'text-red-400'
                          }`}>{fmtHolding(row.unxHoldingValue)}</td>
                          <td className="px-4 py-3 text-right text-red-400 font-mono whitespace-nowrap">{fmtHolding(row.usdHoldingValue)}</td>
                          <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${
                            row.advantagePerHundred >= 0 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{fmtAdvantage(row.advantagePerHundred)}</td>
                          <td className="px-4 py-3 text-right text-purple-200 font-mono whitespace-nowrap">{fmtUnx(row.unxPriceUsd)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-purple-500/30 text-purple-400 text-xs">
                {data.length} data point{data.length !== 1 ? 's' : ''} •{' '}
                <span className="text-green-400">Green rows</span> = UNX advantage growing •{' '}
                <span className="text-red-400">Red rows</span> = UNX advantage declining
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-8 border-t border-purple-500/30">
            <p className="text-2xl font-bold text-white mb-2">UNIYAA</p>
            <p className="text-purple-300">Powered by People, Not Capital</p>
          </div>

        </div>
      </div>
    </main>
  );
}
