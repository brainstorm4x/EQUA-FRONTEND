# EQUA Logo Implementation Instructions

## Current Status
The application uses the centralized Logo component (`src/components/Logo.tsx`) that displays the EQUA brand logo across all pages.

## Logo Assets

The logo is available in two formats in `/public/branding/`:
- **`equa-logo.png`** (default) - 1024x1024 PNG format for faster loading and universal compatibility
- **`equa-logo.svg`** (optional) - 2.4MB SVG format with embedded PNG data

## Usage

### Basic Usage (PNG - Default)
```jsx
import { Logo } from '@/components/Logo';

// PNG format (default) - fastest loading
<Logo size={40} />
```

### SVG Format (Optional)
```jsx
import { Logo } from '@/components/Logo';

// Explicitly use SVG format
<Logo size={40} format="svg" />
```

### With Priority Loading
For above-the-fold content (like hero sections), use the `priority` prop:
```jsx
<Logo size={120} priority={true} />
```

## Logo Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `40` | Width and height in pixels |
| `format` | `'png' \| 'svg'` | `'png'` | Logo file format |
| `priority` | `boolean` | `false` | Next.js Image priority loading |
| `className` | `string` | `''` | Additional CSS classes |

## Logo Locations

The Logo component is used throughout the application:
- `app/page.tsx` - Home page header and hero section
- `app/mint/page.tsx` - Mint page headers across all states
- `app/whitepaper/page.tsx` - Whitepaper page header
- `app/merchants/page.tsx` - Merchants page header
- `app/debug/account/page.tsx` - Debug page headers
- `src/components/WalletDashboard.tsx` - Dashboard component

## Performance Considerations

- **PNG is now the default** for faster initial page load and better browser compatibility
- The PNG logo is preloaded in `app/layout.tsx` for immediate availability
- Loading placeholder appears while the image loads to prevent layout shift
- SVG remains available for cases requiring scalability at any resolution

## Favicon

The application favicon is configured in `app/layout.tsx`:
- `/favicon.ico` - Main favicon
- `/icon.png` - 32x32 PNG icon
- `/apple-icon.png` - Apple touch icon
