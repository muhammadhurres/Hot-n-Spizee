# Hot n Spizee website

## Preview locally

1. Open a terminal in this folder.
2. Run `npm start`.
3. Keep the terminal open and visit `http://127.0.0.1:4173` in your browser.

The app uses hash-based page links (for example `#/cart`) so navigation also works on static preview servers without special `/cart` rewrites. In VS Code, open `public/index.html` and click **Go Live**; or use `npm start` and visit `http://127.0.0.1:4173`. The included preview server uses Node.js built-ins only and listens on this computer, not on the public network.

Run the menu/data checks with `npm test`. No extra packages are required.

The interface uses lightweight glass-inspired surfaces and short entrance/press animations. System reduced-motion preferences disable animations.

## Cloudflare Pages

Build the static site with `npm run build`; the deployable output is `dist/`. In Cloudflare Pages, use `/` as the root directory, `npm run build` as the build command, and `dist` as the build output directory. The purchased domain's canonical origin is `https://hotnspizee.com`; set the `SITE_URL` build environment variable to that exact value. Cloudflare builds fail if this is missing, to avoid publishing incorrect canonical URLs. The build generates pre-rendered homepage, menu, and individual dish pages, `robots.txt`, and `sitemap.xml` from the current public menu spreadsheet.

Cloudflare Pages preview environments also need `SITE_URL` set to their intended canonical production origin. Rebuild and deploy after changing the menu so the pre-rendered pages and sitemap reflect the latest spreadsheet; the interactive menu continues to load its live CSV data.

## Current integration status

- The customer menu loads from the public-read CSV export of the Google Sheet; the local CSV is retained as the supplied source copy.
- Orders and reservation requests open WhatsApp; staff still confirms availability, delivery fees, and payments.
- The restaurant WhatsApp recipient was confirmed by the owner. Staff still needs to confirm availability, delivery fees, and payments for each request.
- Google Sheets is the agreed menu editor. The owner confirmed the spreadsheet currently contains only the public menu tab; the website reads its CSV export, while order acceptance remains manual in WhatsApp.
- Uploaded dish photos are stored as unique local JPEGs in `public/assets/dishes` in their original state; each photo is assigned to one menu item only. Items without a matching supplied photo use the category fallback instead of a reused CSV image.
- The source brand-book PDF still needs review before final visual approval.

## Firebase Hosting

The existing `firebase.json` is for Firebase Hosting only. Cloudflare Pages uses the build and output settings above instead.
