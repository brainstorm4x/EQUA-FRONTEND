'use client';

import { FC, useEffect, useState } from 'react';

/**
 * "Download the Android app" button.
 *
 * The APK is built by brainstorm4x/equa_flutter_app's android-apk workflow and
 * published to a rolling GitHub release; the apk Netlify function
 * (netlify/functions/apk.mjs) turns that into a short-lived signed download
 * URL, so the private repo never has to become public.
 *
 * When no build is available (no token configured, nothing published yet) the
 * reason is logged to the console and visitors just see "coming soon" —
 * setup instructions are for the site owner, not the public.
 */

const ENDPOINT = '/.netlify/functions/apk';

interface ApkInfo {
  available: boolean;
  name?: string;
  size?: number;
  updated_at?: string | null;
  error?: string;
  detail?: string;
}

const formatSize = (bytes?: number) =>
  bytes && bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '';

const formatDate = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
};

interface AppDownloadProps {
  className?: string;
}

export const AppDownload: FC<AppDownloadProps> = ({ className = '' }) => {
  const [info, setInfo] = useState<ApkInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let result: ApkInfo;
      try {
        // 404 / 503 answers carry the same JSON shape with the reason.
        const response = await fetch(`${ENDPOINT}?info=1`);
        result = await response.json();
      } catch {
        result = { available: false, error: 'unreachable' };
      }
      if (!result.available) {
        console.info('Android APK not available:', result.error, result.detail ?? '');
      }
      if (!cancelled) setInfo(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (info === null) {
    return (
      <div className={`text-purple-300 text-sm ${className}`} data-testid="app-download-loading">
        Checking for the latest Android app…
      </div>
    );
  }

  if (!info.available) {
    return (
      <div
        className={`flex items-center justify-center gap-3 bg-white/10 text-purple-200 font-semibold py-3 px-5 rounded-xl text-sm ${className}`}
        data-testid="app-download-unavailable"
      >
        📱 Android app coming soon
      </div>
    );
  }

  const meta = [formatSize(info.size), formatDate(info.updated_at)].filter(Boolean).join(' · ');

  return (
    <div className={className} data-testid="app-download">
      <a
        href={ENDPOINT}
        className="flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-5 rounded-xl transition-colors text-sm"
        data-testid="app-download-btn"
      >
        📲 Download the Android app (APK)
      </a>
      {meta && <p className="text-purple-300 text-xs mt-2 text-center">{meta}</p>}
      <p className="text-purple-300 text-xs mt-2 text-center leading-relaxed">
        Open this on your Android phone. Android will ask you once to allow installs
        from your browser — the app is installed directly, not from the Play Store.
      </p>
    </div>
  );
};
