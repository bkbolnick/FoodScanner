# FoodScanner

A mobile-first web app with four tools that share one scoring method: a **food scanner** (barcodes, or a photo of
a product, dish or meal), a **menu scanner** that ranks the five healthiest dishes on a restaurant menu, a **meal
planner** that writes a plan with a grocery list and prep plan around your goals, and a **Learn** section of short
nutrition articles. Every product, dish and planned meal is scored 0–100 either with a standard method or with a
scoring profile built from your own dietary goals. The scanner also works as a **data coverage tester**: it tells
you whether a product is in Open Food Facts and USDA FoodData Central, what nutrition fields each source has, and
keeps a running tally so you can judge how useful those sources are for the things you actually buy.

Live: https://bkbolnick.github.io/FoodScanner/

Everything is a single `index.html` (vanilla HTML/CSS/JS, no build step). The only external dependency is the
pinned `@zxing/browser` barcode decoder loaded from a CDN, used when the browser has no native `BarcodeDetector`
(which is the case in iOS Safari). The photo scan, the menu scanner and the meal planner call the Claude API with
a key you paste into Settings (or through a proxy URL you choose); the repo contains no key and the other tools
work without one. `.nojekyll` makes GitHub Pages serve the file as-is. `manifest.json` and the
icons let **Add to Home Screen** install it like an app; the UI follows the iOS Human Interface Guidelines (system
type, semantic colours in light and dark, a bottom tab bar, grouped settings and a result sheet).

## Using it

1. Open the page in Safari on your iPhone (it must be served over HTTPS, which GitHub Pages does). Optionally
   add it to the Home Screen; it then opens full screen like an app.
2. Tap **Start camera** and allow camera access. The camera fills the screen; hold the barcode inside the marked
   region, roughly 10–15 cm from the lens. It detects EAN-13, EAN-8, UPC-A and UPC-E continuously. A beep and a
   green flash of the corner marks mean a code was read. The same code is ignored while it stays in view and for
   3 seconds after. Floating buttons offer **Enter a code**, **Stop camera** and, when the phone has one, the torch.
3. Or type a barcode into **Or enter a code** and tap **Look up**. While the camera is running, tap
   **Enter a code** to bring the field back; scanning pauses while you type.
4. The result opens in a sheet from the bottom. Drag the grabber (or tap it) to park it at a peek, half or full
   height; swipe it down or tap the close button to dismiss it. While the camera runs it opens at half height so
   the viewfinder stays usable; at full height scanning pauses until you lower it. The sheet shows the score (see
   **Scoring** below), warnings from your avoid list, product name, brand, image and barcode, then the nutrients
   with a **Per serving / Per 100 g** switch: net carbs (carbs − fiber) on top, then calories, carbs, sugars,
   fiber, protein, fat, saturated fat and sodium, the serving size, and a **Missing fields** line naming whichever
   of serving size, carbs, sugars, fiber, protein and ingredients no source provided. Below that: ingredients, NOVA
   group, Nutri-Score, additives, categories, a **Sources** section saying what each database returned, a
   per-source coverage table, and **Refresh** (bypasses the cache), **Open in Open Food Facts / USDA** and **Copy JSON**.
5. **Scan a photo** (on the Scan screen, next to Start camera, or the camera button while scanning) reads a photo
   of a product, a dish or a meal with no barcode: the model names it, estimates the nutrition of the portion
   shown, reads the ingredients and allergens off the label when one is legible, and the result opens in the same
   sheet, marked **Estimated from the photo** with a confidence level and an **AI estimate** source row instead of
   database rows. A legible barcode in the photo is looked up in the databases instead. Needs an API key (see
   **AI features**).
6. **History** (on the Scan screen, or the clock button while scanning) opens the coverage tally (scans, found in
   Open Food Facts, found in USDA, found in neither, found-but-incomplete, lookup errors) and the scan history with
   each entry's sources, score, warnings and missing fields; photo scans are listed as **AI estimate** and do not
   count in the tally. **Copy log as CSV** copies the log to the clipboard; **Share CSV** opens the iOS share sheet.
   Tap an entry to reopen its result.
7. **Settings** tab: paste a USDA FoodData Central API key (free, from
   https://fdc.nal.usda.gov/api-key-signup) to add USDA as a second source. The key is stored only in this
   browser's localStorage and is never sent anywhere except api.nal.usda.gov. To make it automatic, tap
   **Copy link with my key**, open that link once in Safari and add the page to the Home Screen: the link ends in
   `#usda=YOURKEY`, and every launch from that icon re-saves the key (see Notes). Also: decoder preference,
   **Clear cache** and **Clear log and tally**.
8. **Settings › Developer › Debug log**: an on-screen log of everything (console output, uncaught errors, every
   fetch with its status code). **Copy** copies it so you can paste it into an issue or a chat.

## Menu scanner

**Menu** tab: photograph a restaurant menu (or choose a photo). The model reads every legible dish and estimates,
for a typical serving as that kind of restaurant would make it, the nutrition, the NOVA processing group, the
allergens and whether it is vegan or vegetarian. The app then scores every dish itself with the scoring profile in
force (standard or custom, exactly like a scanned product) and shows **Top 5 for you**, the rest best first,
dishes that contain something on your avoid list set aside with the reason, and dishes with too little data to
score. Tap a dish for the full estimate in the result sheet. The last six menus are kept on the phone and re-scored
with the current profile when reopened; the photo is not kept.

## Meal planner

**Plan** tab: eight short questions (goals with a top priority, calories and nutritional emphasis, meal structure,
eating style with allergies pre-filled from your avoid list, time and equipment, budget and stores, tips such as
food-order guidance, then a review with the plan length: 1, 2, 4 or 10 weeks). Answers are kept on the phone and
reused next time. The model writes one week at a time, streamed so a week can take a minute or two without timing
out; finished weeks appear as they arrive and a plan interrupted halfway offers to continue. Every meal and snack
carries its own nutrition estimate and is scored with your profile, with avoid-list warnings, a day average and a
one-line reason. A meal card opens to show portions, an eating-order tip when requested, ingredients and steps,
plus **Full score and nutrition** (the result sheet), **Lock** and **Replace** (the model writes a different dish
for that slot, told what the old one scored and why). Each week has a grocery list by category with tick-boxes that
are kept with the plan (with an all-weeks view for longer plans) and a prep plan with **Batch cooking** and
**No-prep mode**. **Export** copies or shares the plan and the grocery list as CSV or as plain text through the
system share sheet, so it can go to Notes, Mail or a spreadsheet. **See an example plan** shows a built-in two-day
sample without a key.

## Learn

**Learn** tab: seventeen short articles in five groups (MyPlate basics, Nutrients 101, Food order strategy, Diet
patterns, Meal prep mastery), a search box, popular topics, and a **Build your balanced plate** tool. Articles open
full screen with their update date, reading time and related articles; `…/#learn=slug` opens one directly. The text
is embedded in the page, so it works offline. Educational content only, not medical advice.

## AI features

The photo scan, the menu scanner and the meal planner call the Claude API (`claude-opus-5`, Messages API with a
JSON schema for every answer). Under **Settings › AI features** paste an Anthropic API key, or a proxy URL: with a
key the browser calls `api.anthropic.com` directly and the key is stored only in this browser's localStorage and
sent only to that host; with a proxy URL the request goes there unchanged, without the key, and the proxy adds its
own (an optional proxy token travels as a bearer header so the proxy can refuse strangers). Nothing is sent until
you take a photo or generate a plan, and only what those need is sent: the resized photo, or the plan answers and
the scoring profile in words (the menu scanner sends only the photo; the ranking happens on the phone). Estimates are the model's best guess and are marked
as such everywhere they appear; the app never mixes them into the coverage tally. Each call costs money on your
key: a photo or a menu is a few cents, a week of meals more. **Test key** sends a one-word request.

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
  (3) how strong each preference is: every pick already means less (or more) of that nutrient, and the level says how
  much it counts: slight preference (weight 1) and medium preference (weight 3) are scored against the standard
  front-of-pack guideline cut-offs, while a strict preference (weight 5) also halves the limit cut-offs and raises
  the targets, i.e. fiber, protein and anything wanted more of, by 1.5×; a row sets all picks at once, (4) processing and additives (ignored, moderate weight, or the highest weight) and (5) anything to avoid or
  look for. Each of eleven factors (net carbs, sugars, fiber, protein, saturated fat, total fat, sodium, calories, NOVA
  processing, additives, organic) gets a weight from 0 to 5 and a 0–100 sub-score from its per-100 g value against
  the chosen cut-offs (drinks, whose data is per 100 ml, use the roughly half-size FSA drink cut-offs, scaled the
  same way for strict preferences); the score is
  the weighted average over the factors that have data, and is withheld when less than half of the weighted factors
  have data. The result names the three factors that moved the score most in plain words ("High in sugar",
  "Much less fiber than you want", "Ultra-processed") with the value next to each and a green or red dot for
  whether it helped or hurt, and **How the score adds up** lists every factor with its value, its cut-offs, its
  0–100 marks and its weight, then shows the arithmetic ("Worked out: (5 × 0 + 3 × 82 + …) ÷ 15 = 22"). Weights
  can be fine-tuned under **Adjust weights** (custom profiles only).
- **Avoid list** (question 5): allergens (milk, eggs, gluten, peanuts, tree nuts, soy, fish, shellfish, sesame,
  celery, mustard, lupin, sulphites), non-vegan or non-vegetarian ingredients (the "I am vegan" and "I am vegetarian"
  options) and palm oil never change the score.
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
- On the result sheet the score is a number with a coloured dot and band word (green for Excellent and Good, orange
  for Poor, red for Bad, grey for low confidence); the same dot appears next to each entry in the log.

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
- Everything (cache, log, tally, settings, recent menus, the plan and the planner answers) lives in the browser's
  localStorage. Nothing is sent to any server other than the two data sources and, when you use them, the AI
  service or your proxy.
- Safari can delete a site's localStorage after 7 days of Safari use without visiting the site, so export the log
  now and then if the numbers matter to you.
- Added to the Home Screen, the app runs in standalone mode (`display: standalone` in `manifest.json`). iOS has
  supported the camera in Home Screen web apps since 13.4, but some versions ask for camera permission again on
  every launch and there is no reload button; if the camera misbehaves there, open the page in Safari instead. The
  manifest deliberately has no `start_url`, so an icon made from a `#usda=…`/`#profile=…` link keeps that link.
- Open Food Facts data is © Open Food Facts contributors, ODbL. USDA FoodData Central data is public domain.

## Development

Serve the folder over HTTPS or localhost (camera access needs a secure context), e.g.
`python3 -m http.server 8000` and open http://localhost:8000/. Append `?code=049000028911` to the URL to run a
lookup on load. `window.FS` exposes the lookup, scoring, estimate, plan and article functions for debugging from a
desktop console. The Playwright test harness lives outside the repo; it mocks the two databases and the Claude
endpoint (including streamed answers), so no key is needed to run it.
