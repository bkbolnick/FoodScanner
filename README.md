# FoodScanner

A mobile-first web app that scans food barcodes, shows what the public food databases know about the product, and
scores it 0–100 either with a standard method or with a scoring profile built from your own dietary goals. It also
works as a **data coverage tester**: it tells you whether a product is in Open Food Facts and USDA FoodData Central,
what nutrition fields each source has, and keeps a running tally so you can judge how useful those sources are for
the things you actually buy.

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
4. The result card shows the score (see **Scoring** below), any warnings from your avoid list, product name, brand,
   image, serving size, and
   per-serving / per-100 g values for calories, carbs, sugars, fiber, net carbs (carbs − fiber), protein, fat,
   saturated fat and sodium, plus ingredients, NOVA group, Nutri-Score, additive tags, categories, which source(s)
   found the product and a per-source coverage table. Below the card, **Missing fields** lists whichever of serving
   size, carbs, sugars, fiber, protein and ingredients no source provided.
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

## Scoring

On first open the app asks how products should be scored. Both choices can be changed later under Settings ›
**Scoring**.

- **Standard**: a 0–100 composite of nutritional quality (50 points, from the product's Nutri-Score; when Open Food
  Facts has no grade it is estimated from the nutrients with the 2023 algorithm, using the beverage, fats/oils/nuts and
  cheese variants where the category calls for them, and skipped when Open Food Facts says the Nutri-Score is not
  applicable), additives (25 points, the riskiest additive sets the ceiling and each extra one costs a little),
  processing (15 points from the NOVA group: 1 → 15, 2 → 12, 3 → 8, 4 → 2) and organic certification (10 points).
  Components without data are left out and the score is rescaled with a note; if nutrition is among them the score is
  shown as **low confidence**, and no score is shown when only the organic label is known.
- **Custom**: five questions, each about one thing, all answered by tapping: (1) which nutrients you want less of
  (sugar, net carbs, calories, saturated fat, total fat, sodium), (2) which you want more of (fiber, protein, and,
  for high-fat or weight-gain plans, total fat and calories; anything chosen in question 1 is not offered again),
  (3) how strict each pick is: relaxed (weight 2; only clearly high amounts lose points, cut-offs 1.5× the guideline
  and targets, i.e. fiber, protein and anything wanted more of, ⅔ of it), typical (weight 3, standard front-of-pack
  guideline cut-offs) or strict (weight 5, half the limits and 1.5× the targets), with a row that sets all picks at
  once, (4) processing and additives (ignored, moderate weight, or the highest weight) and (5) anything to avoid or
  look for. Each of eleven factors (net carbs, sugars, fiber, protein, saturated fat, total fat, sodium, calories, NOVA
  processing, additives, organic) gets a weight from 0 to 5 and a 0–100 sub-score from its per-100 g value against
  the chosen cut-offs (drinks, whose data is per 100 ml, use the roughly half-size FSA drink cut-offs, scaled by the
  same strictness); the score is
  the weighted average over the factors that have data, and is withheld when less than half of the weighted factors
  have data. The card lists the three factors that moved the score most. Weights can be fine-tuned under **Adjust
  weights** (custom profiles only).
- **Avoid list** (question 5): allergens (milk, eggs, gluten, peanuts, tree nuts, soy, fish, shellfish, sesame,
  celery, mustard, lupin, sulphites), non-vegan or non-vegetarian ingredients and palm oil never change the score.
  Instead the card shows a red warning when a product contains one, an amber note when it may contain it or the
  status is unknown, and a green "Clear" chip when everything on the list is confirmed absent; the log and the CSV
  export's `avoid_warnings` column carry the red warnings. The checks use Open Food Facts allergen tags and
  ingredient analysis, plus any "Contains: …" statement in either source's ingredient list; when Open Food Facts has
  no allergen analysis for the product (for example products only USDA knows), the ingredient list itself is scanned
  for the allergens as well, and "May contain …" or "made in a facility that also processes …" advisories become
  amber notes. "Prefer organic", also on that question, is the exception:
  it adds the organic label to the score.
- Bands: Excellent 75–100, Good 50–74, Poor 25–49, Bad 0–24. A "low confidence" note appears when much of the weighted
  data is missing.
- **Copy link with my profile** (and **Copy link with my key**) produce one link carrying the USDA key and the
  scoring profile, including the questionnaire answers and avoid list. Opening it seeds the profile once; changes made in
  Settings afterwards are kept, and after Safari has cleared storage the same link seeds it again. Copy a fresh link to
  pick up later edits.
- Scores are a guide computed from public data, not medical advice. The additive risk levels are this app's own
  editorial classification informed by public regulatory opinions; additives it does not know get a small penalty.

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
