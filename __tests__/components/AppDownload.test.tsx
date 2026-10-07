/**
 * Tests for the Android app download button.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { AppDownload } from '@/components/AppDownload';

const mockFetch = (body: unknown, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => body }) as any;
};

describe('AppDownload', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('asks the apk function for build info', async () => {
    mockFetch({ available: false, error: 'no_build' }, false);
    render(<AppDownload />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/.netlify/functions/apk?info=1');
    });
  });

  it('links to the APK with its size and date when a build is available', async () => {
    mockFetch({
      available: true,
      name: 'uniyaa-1.0.0-abc1234.apk',
      size: 73_500_000,
      updated_at: '2026-10-08T10:00:00Z',
    });
    render(<AppDownload />);

    const link = await screen.findByTestId('app-download-btn');
    expect(link).toHaveAttribute('href', '/.netlify/functions/apk');
    expect(screen.getByText(/70\.1 MB/)).toBeInTheDocument();
  });

  it('shows "coming soon" (not setup details) when there is no build', async () => {
    mockFetch(
      { available: false, error: 'not_configured', detail: 'Set APK_GITHUB_TOKEN in the Netlify site environment' },
      false,
    );
    render(<AppDownload />);

    expect(await screen.findByTestId('app-download-unavailable')).toHaveTextContent('Android app coming soon');
    expect(screen.queryByText(/APK_GITHUB_TOKEN/)).not.toBeInTheDocument();
    expect(console.info).toHaveBeenCalledWith(
      'Android APK not available:',
      'not_configured',
      'Set APK_GITHUB_TOKEN in the Netlify site environment',
    );
  });

  it('shows "coming soon" when the function is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    render(<AppDownload />);

    expect(await screen.findByTestId('app-download-unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('app-download-btn')).not.toBeInTheDocument();
  });
});
