# EQUA Logo Implementation Instructions

## Current Status
The application currently uses a placeholder logo (purple box with "E" letter) in the header sections.

## To Add the Actual EQUA Logo

1. **Add logo files to the public folder:**
   - Place `equa-logo.svg` (or .png) in `/public/` directory
   - Place `favicon.ico` in `/app/` directory (Next.js automatically uses this)

2. **Update the logo in the header components:**
   
   The logo appears in two locations:
   - `app/page.tsx` (Home page header)
   - `app/mint/page.tsx` (Mint page header)

   Current placeholder code:
   ```jsx
   <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
     <span className="text-white font-bold text-xl">E</span>
   </div>
   ```

   Replace with:
   ```jsx
   <Image 
     src="/equa-logo.svg" 
     alt="EQUA Logo" 
     width={40} 
     height={40}
     className="rounded-lg"
   />
   ```

3. **Import the Image component at the top of the files:**
   ```jsx
   import Image from 'next/image';
   ```

## Logo Requirements
- Recommended size: 40x40 pixels (or scalable SVG)
- Format: SVG preferred (or PNG with transparent background)
- Should work well on dark purple background
- Favicon should be 32x32 or 16x16 pixels

## Files to Update
- `/app/page.tsx` - Home page header
- `/app/mint/page.tsx` - Mint page header (4 locations: wallet-not-connected, checking-registration, program-not-ready, main page)
- `/app/favicon.ico` - Browser favicon
