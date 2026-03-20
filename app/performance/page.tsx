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
  equaPriceUsd: number;
  equaPriceLocal: number | null;
  eqxPriceUsd: number;
  usdInflationIndex: number;
  equaPurchasingPower: number;
  source: string;
  // "$100 held" comparison fields (added by get-performance-data)
  equaHoldingValue: number;
  usdHoldingValue: number;
  advantagePerHundred: number;
}

interface PerformanceSummary {
  equaPriceChange: number;
  equaPriceChangePercent: number;
  usdPurchasingPowerLoss: number;
  equaVsUsdAdvantage: number;
  currentEquaPriceUsd: number;
  currentEquaPriceLocal: number | null;
  currentEqxPriceUsd: number;
  dataPoints: number;
  // "$100 held" comparison fields
  equaHoldingValue: number;
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

type TimeRange = '7d' | '30d' | '90d' | 'all';
type Interval = 'hourly' | 'daily';

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

function fmtEqx(n: number | null | undefined): string {
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

function getRangeFrom(range: TimeRange): string | undefined {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case 'all':
      return undefined;
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default function PerformancePage() {
  const [currency, setCurrency] = useState<string>('USD');
  const [range, setRange] = useState<TimeRange>('30d');
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
              <h1 className="text-2xl font-bold text-white">EQUA Token</h1>
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
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">EQUA Performance</h2>
            <p className="text-purple-300 text-lg">
              See how EQX helps EQUA retain purchasing power compared to traditional currencies
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
                {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((r) => (
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

          {/* $100 Held Hero Comparison Banner */}
          {summary && !loading && !error && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
              <p className="text-center text-purple-200 text-sm mb-1">
                If you invested $100 in EQUA vs $100 in USD
              </p>
              <p className="text-center text-purple-400 text-xs mb-6">
                over the last {summary.holdingPeriodLabel}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* EQUA card */}
                <div className={`rounded-xl p-5 border text-center ${
                  summary.equaHoldingValue >= 100
                    ? 'border-green-500/40 bg-green-900/20'
                    : 'border-red-500/40 bg-red-900/20'
                }`}>
                  <p className="text-purple-200 text-sm mb-1">💰 $100 in EQUA</p>
                  <p className="text-purple-300 text-xs mb-3">Now worth:</p>
                  <p className={`text-3xl font-bold ${
                    summary.equaHoldingValue >= 100 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {fmtHolding(summary.equaHoldingValue)}
                  </p>
                  <p className={`text-sm mt-1 ${
                    summary.equaHoldingValue >= 100 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {summary.equaHoldingValue >= 100 ? '▲' : '▼'}{' '}
                    {fmtPct(summary.equaHoldingValue - 100)}
                  </p>
                </div>

                {/* USD card */}
                <div className="rounded-xl p-5 border border-red-500/40 bg-red-900/20 text-center">
                  <p className="text-purple-200 text-sm mb-1">💵 $100 in USD</p>
                  <p className="text-purple-300 text-xs mb-3">Now worth (after inflation):</p>
                  <p className="text-3xl font-bold text-red-400">
                    {fmtHolding(summary.usdHoldingValue)}
                  </p>
                  <p className="text-sm mt-1 text-red-400">
                    ▼ {fmtPct(summary.usdHoldingValue - 100)}
                  </p>
                </div>
              </div>

              {/* Advantage summary */}
              <div className="text-center">
                <p className={`text-lg font-semibold ${
                  summary.advantagePerHundred >= 0 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  EQUA preserved{' '}
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
                      <th className="px-4 py-3 text-right text-purple-300 font-medium whitespace-nowrap">$100 EQUA →</th>
                      <th className="px-4 py-3 text-right text-purple-300 font-medium whitespace-nowrap">$100 USD →</th>
                      <th className="px-4 py-3 text-right text-purple-300 font-medium whitespace-nowrap">EQUA Advantage</th>
                      <th className="px-4 py-3 text-right text-purple-300 font-medium whitespace-nowrap">EQX Basket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => {
                      const prev = idx > 0 ? data[idx - 1] : null;
                      // Color rows by whether the EQUA advantage is growing or shrinking.
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
                            row.equaHoldingValue >= 100 ? 'text-green-400' : 'text-red-400'
                          }`}>{fmtHolding(row.equaHoldingValue)}</td>
                          <td className="px-4 py-3 text-right text-red-400 font-mono whitespace-nowrap">{fmtHolding(row.usdHoldingValue)}</td>
                          <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${
                            row.advantagePerHundred >= 0 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{fmtAdvantage(row.advantagePerHundred)}</td>
                          <td className="px-4 py-3 text-right text-purple-200 font-mono whitespace-nowrap">{fmtEqx(row.eqxPriceUsd)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-purple-500/30 text-purple-400 text-xs">
                {data.length} data point{data.length !== 1 ? 's' : ''} •{' '}
                <span className="text-green-400">Green rows</span> = EQUA advantage growing •{' '}
                <span className="text-red-400">Red rows</span> = EQUA advantage declining
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-8 border-t border-purple-500/30">
            <p className="text-2xl font-bold text-white mb-2">EQUA</p>
            <p className="text-purple-300">Equal Access. Equal Opportunity. Equal Economy.</p>
          </div>

        </div>
      </div>
    </main>
  );
}
