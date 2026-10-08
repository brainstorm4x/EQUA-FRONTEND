/**
 * "Open in wallet" links for mobile browsers.
 *
 * Chrome and Safari on a phone have no Solana wallet inside the page, so the
 * site cannot ask Phantom or Solflare to sign anything from there. These
 * universal links open a page inside the wallet app's own browser, where the
 * wallet is injected and the normal mobile in-app flow works.
 *
 * Formats from the wallets' docs:
 *   https://phantom.com/ul/browse/<url>?ref=<ref>
 *   https://solflare.com/ul/v1/browse/<url>?ref=<ref>
 */

export function phantomBrowseLink(url: string, ref: string): string {
  return `https://phantom.com/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`;
}

export function solflareBrowseLink(url: string, ref: string): string {
  return `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`;
}
