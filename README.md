# Hot n Spizee website

## Preview locally

1. Open a terminal in this folder.
2. Run `npm start`.
3. Keep the terminal open and visit `http://127.0.0.1:4173` in your browser.

The app uses hash-based page links (for example `#/cart`) so navigation also works on static preview servers without special `/cart` rewrites. In VS Code, open `public/index.html` and click **Go Live**; or use `npm start` and visit `http://127.0.0.1:4173`. The included preview server uses Node.js built-ins only and listens on this computer, not on the public network.

Run the menu/data checks with `npm test`. No extra packages are required.

The interface uses lightweight solid surfaces and short entrance/press animations. The branded startup intro respects reduced-motion preferences.

## Cloudflare Pages

Build the static site with `npm run build`; the deployable output is `dist/`. In Cloudflare Pages, use `/` as the root directory, `npm run build` as the build command, and `dist` as the build output directory. The purchased domain's canonical origin is `https://hotnspizee.com`; set the `SITE_URL` build environment variable to that exact value. Cloudflare builds fail if this is missing, to avoid publishing incorrect canonical URLs. The build generates pre-rendered homepage, menu, and individual dish pages, `robots.txt`, `sitemap.xml`, and a menu-synced `llms.txt` from the current public menu spreadsheet. The homepage includes the restaurant, website, and visible FAQ structured data; dish pages include menu-item and offer structured data.

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

## Android app

Capacitor packages the existing static site; it does not change the website UI or local cart behavior. The web build is `dist/`, configured as Capacitor's `webDir`.

For the first Android setup, build the site and add the native platform:

1. Run `npm run build`.
2. Run `npx cap add android`.

After changing the website, run `npm run android:sync` to rebuild `dist/` and sync it into the Android project. Open the project in Android Studio with `npx cap open android`.

### Quiet Android updates

The Android app checks GitHub Releases on launch and periodically while connected. It downloads only a newer APK, verifies its SHA-256 and package/version metadata, then submits it to Android's `PackageInstaller` for a no-user-action self-update when the device allows it. Android may still require confirmation on some OS versions or devices.

The first update may ask users to allow **Hot n Spizee** itself to install updates in Android settings. This is separate from allowing a browser or file manager to install the first APK. The app ID and release signing key must remain unchanged.

Before publishing signed APKs, create a private release keystore in Android Studio (**Build > Generate Signed Bundle / APK > APK > Create new**) and back it up securely. Do not commit or send the keystore or passwords in chat. Add these repository secrets under **Settings > Secrets and variables > Actions**:

- `ANDROID_KEYSTORE_BASE64`: Base64-encoded keystore file.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: key alias.
- `ANDROID_KEY_PASSWORD`: key password.

On Windows PowerShell, encode the keystore with `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\release-key.jks"))` and paste the output directly into the GitHub secret. The APK release workflow does not publish an update unless all four secrets are set. Version codes increase with each workflow run. Because no users have installed the app yet, configure the permanent key before distributing the first signed APK.
