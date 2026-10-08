import { phantomBrowseLink, solflareBrowseLink } from '@/utils/walletBrowseLinks';
import { detectWalletEnvironment } from '@/utils/walletEnvironment';

const ORIGIN = 'https://uniyaatoken.netlify.app';

describe('wallet browse links', () => {
  it('builds the Phantom universal link with the target and ref encoded', () => {
    expect(phantomBrowseLink(`${ORIGIN}/mint`, ORIGIN)).toBe(
      'https://phantom.com/ul/browse/https%3A%2F%2Funiyaatoken.netlify.app%2Fmint' +
        '?ref=https%3A%2F%2Funiyaatoken.netlify.app'
    );
  });

  it('builds the Solflare universal link with the target and ref encoded', () => {
    expect(solflareBrowseLink(`${ORIGIN}/mint`, ORIGIN)).toBe(
      'https://solflare.com/ul/v1/browse/https%3A%2F%2Funiyaatoken.netlify.app%2Fmint' +
        '?ref=https%3A%2F%2Funiyaatoken.netlify.app'
    );
  });
});

describe('detectWalletEnvironment', () => {
  const setNavigator = (userAgent: string, maxTouchPoints: number) => {
    Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true });
    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
  };

  beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    delete (window as any).phantom;
  });

  it('treats a touchscreen Windows laptop as desktop', () => {
    setNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36', 10);
    expect(detectWalletEnvironment()).toBe('desktop');
  });

  it('treats Chrome on Android as a mobile browser', () => {
    setNavigator('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129.0 Mobile Safari/537.36', 5);
    expect(detectWalletEnvironment()).toBe('mobile-browser');
  });

  it('treats an iPad in desktop mode as a mobile browser', () => {
    setNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15', 5);
    expect(detectWalletEnvironment()).toBe('mobile-browser');
  });

  it('treats a Mac without touch as desktop', () => {
    setNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15', 0);
    expect(detectWalletEnvironment()).toBe('desktop');
  });

  it('treats the Phantom in-app browser as in-app', () => {
    setNavigator('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129.0 Mobile Safari/537.36', 5);
    (window as any).phantom = { solana: { isPhantom: true } };
    expect(detectWalletEnvironment()).toBe('mobile-inapp');
  });
});
