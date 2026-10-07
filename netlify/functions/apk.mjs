/**
 * The Android app, downloadable from the dashboard — GET /api/apk.
 *
 * WHY THIS IS A REDIRECT AND NOT A FILE. Two constraints decide the whole
 * design. The repo is PRIVATE, so the obvious
 * `github.com/<owner>/<repo>/releases/latest/download/…` link asks a phone
 * browser to log in to GitHub and then fails. And a Netlify function may only
 * return a few megabytes synchronously, while the APK is tens — so proxying
 * the bytes through here is not an option either.
 *
 * So this function holds the GitHub credential, asks GitHub for the release
 * asset, and answers 302 with the SHORT-LIVED SIGNED URL GitHub hands back.
 * The phone downloads straight from GitHub's CDN, the token never leaves the
 * server, and nothing in the repo has to become public.
 *
 * WHAT IS EXPOSED. Anyone who can reach the dashboard can download the APK —
 * the same posture as the dashboard itself, which has no login. The APK holds
 * no secret: google-services.json is meant to ship inside an app, and the
 * service account that actually sends push lives only in Netlify's env.
 *
 * The asset comes from .github/workflows/android-apk.yml, which rebuilds it on
 * every push to main and replaces the single rolling release below.
 */

/** The release tag the APK workflow keeps rewriting. One tag, one asset, so
 *  there is no "which build is newest" logic here. */
export const TAG = "android-latest";

/** Hard-coded rather than configured: this function exists to serve the
 *  UNIYAA app build, and a wrong value would be a confusing 404 rather than an
 *  error. A fork changes one line. */
export const REPO = "brainstorm4x/equa_flutter_app";

const API = "https://api.github.com";

/** A token with read access to the repo's releases. Netlify does not set
 *  GITHUB_TOKEN itself, but plenty of tooling does, so both names are read. */
export const token = () =>
  (process.env.APK_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "").trim();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** The APK among the release's assets. A release can also carry mapping files
 *  or checksums, so the extension is the selector, not the position. */
export function pickApk(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return (
    assets.find((a) => typeof a?.name === "string" && a.name.toLowerCase().endsWith(".apk")) || null
  );
}

/** What the dashboard shows beside the button: enough to tell whether the
 *  build on offer is the one you already have. */
export function describe(release, asset) {
  return {
    available: true,
    name: asset.name,
    size: asset.size,
    updated_at: asset.updated_at || release?.published_at || null,
    published_at: release?.published_at || null,
    notes: typeof release?.body === "string" ? release.body.slice(0, 500) : "",
  };
}

/**
 * The signed CDN URL for an asset.
 *
 * GitHub answers an authenticated asset request with a 302 to a short-lived
 * S3 URL rather than the bytes, which is exactly what is wanted — the redirect
 * is followed by the PHONE. `redirect: "manual"` is what keeps fetch from
 * following it and pulling 60 MB into a function that cannot return them.
 */
export async function signedUrl(assetUrl, fetchImpl = fetch) {
  const res = await fetchImpl(assetUrl, {
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${token()}`,
      "User-Agent": "uniyaa-apk",
    },
    redirect: "manual",
  });
  const location = res.headers.get("location");
  if (location) return location;
  if (res.status >= 400) {
    return { error: `github_asset_${res.status}` };
  }
  // A 200 means the bytes came back inline, which this function cannot pass on
  // within Netlify's response limit. Say so rather than truncating an APK.
  return { error: "github_returned_body_not_redirect" };
}

export async function handle(req, fetchImpl = fetch) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }
  const info = new URL(req.url).searchParams.get("info") !== null;

  if (!token()) {
    return json(
      {
        available: false,
        error: "not_configured",
        detail:
          "Set APK_GITHUB_TOKEN in the Netlify site environment to a token with read access to this repo's releases.",
      },
      503,
    );
  }

  let release;
  const res = await fetchImpl(`${API}/repos/${REPO}/releases/tags/${TAG}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token()}`,
      "User-Agent": "uniyaa-apk",
    },
  });
  if (res.status === 404) {
    return json(
      {
        available: false,
        error: "no_build",
        detail: `No "${TAG}" release yet — the Android APK workflow has not published one.`,
      },
      404,
    );
  }
  if (!res.ok) {
    return json({ available: false, error: `github_${res.status}` }, 502);
  }
  release = await res.json();

  const asset = pickApk(release);
  if (!asset) {
    return json({ available: false, error: "no_apk", detail: "The release carries no .apk asset." }, 404);
  }
  if (info) return json(describe(release, asset));

  const url = await signedUrl(asset.url, fetchImpl);
  if (typeof url !== "string") return json({ available: false, ...url }, 502);
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
}

export default (req) => handle(req);
