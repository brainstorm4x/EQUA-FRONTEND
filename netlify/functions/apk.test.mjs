/**
 * Tests for netlify/functions/apk.mjs — handing the phone an APK.
 *
 * Run: npm run test:functions
 *
 * Nothing here talks to GitHub. The two things worth pinning down are the ones
 * that fail silently in production: the function must NEVER read the asset
 * body (tens of megabytes through a function that can return a few), and a
 * missing build must read as "no build yet", not as a server fault.
 */
import test from "node:test";
import assert from "node:assert/strict";

async function withToken(value, fn) {
  const before = process.env.APK_GITHUB_TOKEN;
  const beforeGh = process.env.GITHUB_TOKEN;
  if (value === null) delete process.env.APK_GITHUB_TOKEN;
  else process.env.APK_GITHUB_TOKEN = value;
  delete process.env.GITHUB_TOKEN;
  try {
    return await fn(await import("./apk.mjs"));
  } finally {
    if (before === undefined) delete process.env.APK_GITHUB_TOKEN;
    else process.env.APK_GITHUB_TOKEN = before;
    if (beforeGh !== undefined) process.env.GITHUB_TOKEN = beforeGh;
  }
}

const RELEASE = {
  published_at: "2026-09-15T10:00:00Z",
  body: "UNIYAA Android build from `abc1234`.",
  assets: [
    { name: "mapping.txt", url: "https://api.github.com/x/assets/1", size: 10 },
    {
      name: "uniyaa-1.0.0-abc1234.apk",
      url: "https://api.github.com/x/assets/2",
      size: 24_000_000,
      updated_at: "2026-09-15T10:01:00Z",
    },
  ],
};

const SIGNED = "https://objects.githubusercontent.com/signed?token=short-lived";

/** A GitHub that behaves like GitHub: the release as JSON, and an asset
 *  request answered with a redirect rather than bytes. */
function fakeGitHub({ release = RELEASE, status = 200, assetStatus = 302 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.includes("/releases/tags/")) {
      if (status !== 200) return new Response("nope", { status });
      return new Response(JSON.stringify(release), { status: 200 });
    }
    if (assetStatus === 302) {
      return new Response(null, { status: 302, headers: { Location: SIGNED } });
    }
    if (assetStatus === 200) return new Response("PK-apk-bytes", { status: 200 });
    return new Response("denied", { status: assetStatus });
  };
  return { fetchImpl, calls };
}

const get = (query = "") => new Request(`https://uniyaa.test/api/apk${query}`);

/* ────────────────────────────────────────────────── choosing the file ──── */

test("the .apk is picked out of the release's assets, whatever else is there", async () => {
  const { pickApk } = await import("./apk.mjs");
  assert.equal(pickApk(RELEASE).name, "uniyaa-1.0.0-abc1234.apk");
  assert.equal(pickApk({ assets: [{ name: "notes.txt" }] }), null);
  assert.equal(pickApk(null), null, "a malformed release is 'no apk', not a crash");
});

/* ───────────────────────────────────────────────────── the download ────── */

test("a download is a 302 to GitHub's signed URL, never the bytes", async () => {
  await withToken("ghp_test", async ({ handle }) => {
    const { fetchImpl, calls } = fakeGitHub();
    const res = await handle(get(), fetchImpl);

    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), SIGNED);
    assert.equal(await res.text(), "", "the function returns no body");

    const assetCall = calls.find((c) => c.url.includes("/assets/"));
    assert.equal(assetCall.url, "https://api.github.com/x/assets/2", "the apk, not the mapping file");
    assert.equal(
      assetCall.init.redirect,
      "manual",
      "following the redirect would pull the whole APK into the function",
    );
    assert.equal(assetCall.init.headers.Accept, "application/octet-stream");
    assert.ok(assetCall.init.headers.Authorization.includes("ghp_test"));
  });
});

test("the token is sent to GitHub and never to the client", async () => {
  await withToken("ghp_secret", async ({ handle }) => {
    const { fetchImpl } = fakeGitHub();
    const res = await handle(get(), fetchImpl);
    const dump = [...res.headers].flat().join(" ") + (await res.text());
    assert.ok(!dump.includes("ghp_secret"));
  });
});

test("bytes instead of a redirect is an error, not a truncated APK", async () => {
  // Netlify caps a synchronous function response at a few MB. Passing an APK
  // body through would produce a file that downloads and will not install.
  await withToken("ghp_test", async ({ handle }) => {
    const { fetchImpl } = fakeGitHub({ assetStatus: 200 });
    const res = await handle(get(), fetchImpl);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error, "github_returned_body_not_redirect");
  });
});

/* ─────────────────────────────────────────────────────── the metadata ─── */

test("?info describes the build without touching the asset", async () => {
  await withToken("ghp_test", async ({ handle }) => {
    const { fetchImpl, calls } = fakeGitHub();
    const body = await (await handle(get("?info=1"), fetchImpl)).json();
    assert.equal(body.available, true);
    assert.equal(body.name, "uniyaa-1.0.0-abc1234.apk");
    assert.equal(body.size, 24_000_000);
    assert.equal(body.updated_at, "2026-09-15T10:01:00Z");
    assert.ok(!calls.some((c) => c.url.includes("/assets/")), "no asset request for metadata");
  });
});

/* ───────────────────────────────────────── when there is nothing to give ─ */

test("no token reads as 'not set up', with the fix in the response", async () => {
  await withToken(null, async ({ handle }) => {
    const res = await handle(get("?info=1"), () => {
      throw new Error("must not reach GitHub");
    });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.available, false);
    assert.equal(body.error, "not_configured");
    assert.ok(body.detail.includes("APK_GITHUB_TOKEN"));
  });
});

test("no release yet is 'no build', not a fault", async () => {
  await withToken("ghp_test", async ({ handle }) => {
    const { fetchImpl } = fakeGitHub({ status: 404 });
    const res = await handle(get("?info=1"), fetchImpl);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, "no_build");
  });
});

test("a release with no apk says so", async () => {
  await withToken("ghp_test", async ({ handle }) => {
    const { fetchImpl } = fakeGitHub({ release: { assets: [{ name: "notes.txt" }] } });
    const res = await handle(get("?info=1"), fetchImpl);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, "no_apk");
  });
});

test("a GitHub outage is a 502, and a bad token is not mistaken for one", async () => {
  await withToken("ghp_test", async ({ handle }) => {
    const { fetchImpl } = fakeGitHub({ status: 500 });
    assert.equal((await handle(get(), fetchImpl)).status, 502);
  });
  await withToken("ghp_test", async ({ handle }) => {
    const { fetchImpl } = fakeGitHub({ status: 401 });
    const res = await handle(get(), fetchImpl);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error, "github_401");
  });
});

test("POST is refused", async () => {
  await withToken("ghp_test", async ({ handle }) => {
    const res = await handle(new Request("https://uniyaa.test/api/apk", { method: "POST" }), () => {
      throw new Error("must not reach GitHub");
    });
    assert.equal(res.status, 405);
  });
});
