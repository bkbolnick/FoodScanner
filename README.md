# FoodScanner

A mobile-first web app that scans food barcodes and shows what the public food databases know about the product.
Version 1 is a **data coverage tester**: it tells you whether a product is in Open Food Facts and USDA FoodData
Central, what nutrition fields each source has, and keeps a running tally so you can judge how useful those
sources are for the things you actually buy. Scoring comes later.

Live: https://bkbolnick.github.io/FoodScanner/

Everything is a single `index.html` (vanilla HTML/CSS/JS, no build step). The only external dependency is the
pinned `@zxing/browser` barcode decoder loaded from a CDN, used when the browser has no native `BarcodeDetector`
(which is the case in iOS Safari). `.nojekyll` makes GitHub Pages serve the file as-is.

## Using it

1. Open the page in Safari on your iPhone (it must be served over HTTPS, which GitHub Pages does).
2. Tap **Start camera** and allow camera access. Hold the barcode inside the frame, roughly 10–15 cm from the
   lens; it detects EAN-13, EAN-8, UPC-A and UPC-E continuously. A beep and a green flash mean a code was read.
   The same code is ignored while it stays in view and for 3 seconds after.
3. Or type a barcode into the field under the camera and tap **Look up**. While the camera is running, tap
   **Type a barcode** to bring the field back; scanning pauses while you type.
4. The result card shows product name, brand, image, serving size, and per-serving / per-100 g values for
   calories, carbs, sugars, fiber, net carbs (carbs − fiber), protein, fat, saturated fat and sodium, plus
   ingredients, NOVA group, Nutri-Score, additive tags, categories, which source(s) found the product and a
   per-source coverage table. Below the card, **Missing fields** lists whichever of serving size, carbs, sugars,
   fiber, protein and ingredients no source provided.
5. **Log** tab: the coverage tally (scans, found in OFF, found in USDA, found in neither, found-but-incomplete)
   and the scan log. **Export log** copies the log as CSV to the clipboard; **Share CSV** opens the iOS share
   sheet. Tap a log entry to reopen its result.
6. **Settings** tab: paste a USDA FoodData Central API key (free, from
   https://fdc.nal.usda.gov/api-key-signup) to add USDA as a second source. The key is stored only in this
   browser's localStorage and is never sent anywhere except api.nal.usda.gov. To make it automatic, tap
   **Copy link with my key**, open that link once in Safari and add the page to the Home Screen: the link ends in
   `#usda=YOURKEY`, and every launch from that icon re-saves the key (see Notes). Also: decoder preference,
   **Clear cache** and **Clear log & tally**.
7. **Debug** button (top right): an on-screen log of everything (console output, uncaught errors, every fetch
   with its status code). **Copy log** copies it so you can paste it into an issue or a chat.

## Notes

- Lookups hit `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`. US UPC-A codes are 12 digits and
  Open Food Facts often stores them as 13 digits with a leading zero, so a miss is retried with the leading zero
  added (or removed). UPC-E codes are expanded to UPC-A first. The form that worked is recorded on the card and in
  the log.
- With a USDA key saved, `https://api.nal.usda.gov/fdc/v1/foods/search` is queried with `dataType=Branded` and
  the result is matched on `gtinUpc`. USDA is never called without a key.
- Opening the app as `https://bkbolnick.github.io/FoodScanner/#usda=YOURKEY` saves that key on load. The part after
  `#` is never sent to any server, so the key stays off GitHub and off GitHub Pages, but the link itself contains
  it, so don't share it. Because a Home Screen icon made from that link re-saves the key on every launch, it also
  survives Safari's 7-day storage purge.
- Every lookup that Open Food Facts answered (found or not found) is cached in localStorage keyed by barcode, so
  repeat scans are instant and offline. Open Food Facts network errors are not cached; a failed or skipped USDA
  query is retried on a later lookup of the same code. **Re-fetch** on a card bypasses the cache.
- Everything (cache, log, tally, settings) lives in the browser's localStorage. Nothing is sent to any server other
  than the two data sources.
- Safari can delete a site's localStorage after 7 days of Safari use without visiting the site, so export the log
  now and then if the numbers matter to you.
- Open Food Facts data is © Open Food Facts contributors, ODbL. USDA FoodData Central data is public domain.

## Development

Serve the folder over HTTPS or localhost (camera access needs a secure context), e.g.
`python3 -m http.server 8000` and open http://localhost:8000/. Append `?code=049000028911` to the URL to run a
lookup on load. `window.FS` exposes the lookup and decoding functions for debugging from a desktop console.
