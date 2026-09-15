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
(which is the case in iOS Safari). The photo scan, the menu scanner and the meal planner call the Claude API
through the site's built-in proxy (a Cloudflare Worker that holds the keys, see AI features), or with a key you
paste into Settings or a proxy URL you choose; the repo contains no key and the other tools work without one. `.nojekyll` makes GitHub Pages serve the file as-is. `manifest.json` and the
icons let **Add to Home Screen** install it like an app; the UI follows the iOS Human Interface Guidelines (system
type, semantic colours in light and dark, a bottom tab bar, grouped settings and a result sheet).

## Using it

1. Open the page in Safari on your iPhone (it must be served over HTTPS, which GitHub Pages does). Optionally
   add it to the Home Screen; it then opens full screen like an app.
2. The **Analyze** tab offers three things: **Scan a barcode**, **Photograph food** and **Review a menu**, with
   **History** underneath. **Review a menu** opens the menu reader under the Analyze tab, with a back link.
   Tap **Scan a barcode** and allow camera access. The camera fills the screen; hold the
   barcode inside the marked region, roughly 10–15 cm from the lens. It detects EAN-13, EAN-8, UPC-A and UPC-E
   continuously. A beep and a green flash of the corner marks mean a code was read. The same code is ignored while
   it stays in view and for 3 seconds after. Floating buttons offer **Enter a code**, **Stop scanning** and, when
   the phone has one, the torch.
3. Or, while the camera is running, tap **Enter a code**, type the barcode and tap **Look up**; scanning pauses
   while you type. If the camera cannot start at all (permission denied, no camera, another app using it), the code
   field appears on the Analyze screen so a barcode can still be typed.
4. The result opens in a sheet from the bottom. Drag the grabber (or tap it) to park it at a peek, half or full
   height; swipe it down or tap the close button to dismiss it. While the camera runs it opens at half height so
   the viewfinder stays usable; at full height scanning pauses until you lower it. The sheet shows the score (see
   **Scoring** below), warnings from your avoid list, product name, brand, image and barcode, then the nutrients
   with a **Per serving / Per 100 g** switch: net carbs (carbs − fiber) on top, then calories, carbs, sugars,
   fiber, protein, fat, saturated fat and sodium, the serving size, and a **Missing fields** line naming whichever
   of serving size, carbs, sugars, fiber, protein and ingredients no source provided. Below that: ingredients, NOVA
   group, Nutri-Score, additives, categories, a **Sources** section saying what each database returned, a
   per-source coverage table, and **Refresh** (bypasses the cache), **Open in Open Food Facts / USDA** and **Copy JSON**.
5. **Photograph food** (on the Analyze screen, below Scan a barcode, or the camera button while scanning) reads a
   photo of a product, a dish or a meal with no barcode: the model names it, estimates the nutrition of the portion
   shown, reads the ingredients and allergens off the label when one is legible, and the result opens in the same
   sheet, marked **Estimated from the photo** with a confidence level and an **AI estimate** source row instead of
   database rows. A legible barcode in the photo is looked up in the databases instead. Needs the site's built-in proxy or
   a key of your own (see **AI features**).
6. **History** (on the Analyze screen, or the clock button while scanning) opens the coverage tally (barcode scans,
   photo estimates, found in Open Food Facts, found in USDA, found in neither, found-but-incomplete, lookup errors)
   and the log with each entry's sources, score, warnings and missing fields. Photo estimates are listed as
   **AI estimate**; they count on the Photo estimates row only, never in the database rows. **Copy log as CSV**
   copies the log to the clipboard; **Share CSV** opens the iOS share sheet. Tap an entry to reopen its result.
7. **Settings** tab: **Data and AI** says what is on and through what (with the site's built-in proxy, "AI
   features and USDA lookups are on" and nothing to set up; the site's keys never appear on the page). **Use your
   own keys** opens the fields for a key of your own (on a site with no built-in proxy they are simply shown): a
   USDA FoodData Central API key (free, from
   https://fdc.nal.usda.gov/api-key-signup) is stored only in this browser's localStorage, is never sent anywhere
   except api.nal.usda.gov, and is used instead of the site's. To make it automatic, tap
   **Copy link with my key**, open that link once in Safari and add the page to the Home Screen: the link ends in
   `#usda=YOURKEY`, and every launch from that icon re-saves the key (see Notes). Also: decoder preference,
   **Clear cache** and **Clear log and tally**.
8. **Settings › Developer › Debug log**: an on-screen log of everything (console output, uncaught errors, every
   fetch with its status code). **Copy** copies it so you can paste it into an issue or a chat.

## Menu scanner

**Review a menu** on the Analyze screen: photograph a restaurant menu (or choose a photo). The model reads every
legible dish and estimates, for a typical serving as that kind of restaurant would make it, the nutrition, the NOVA
processing group, the
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

**Built-in proxy (AI and USDA for everyone).** `proxy/` holds a small Cloudflare Worker that keeps the Anthropic
key, and optionally a USDA key, on Cloudflare and forwards the site's requests. It can be deployed from a phone: paste
the keys into the repository's Actions secrets and the workflow in `.github/workflows/deploy-proxy.yml` deploys the
Worker and writes its URL into `DEFAULT_PROXY` near the top of the script in `index.html` (steps in
`proxy/README.md`; a computer with `wrangler` works too). Every visitor then gets the photo scan, the menu scanner,
the meal planner and USDA lookups with nothing to type. For one phone only, open `…/#proxy=<worker url>` instead and
agree when the app asks (that covers the AI features, not USDA). A key or proxy a user saves under Settings ›
Use your own keys always takes precedence over the built-in one; with a built-in proxy those fields stay out of the
way until asked for.


The photo scan, the menu scanner and the meal planner call the Claude API (`claude-opus-5`, Messages API with a
JSON schema for every answer; when the API cannot compile an answer's schema it answers HTTP 400, and the app then
sends the same request with no output format, writes the schema into the prompt and reads the JSON out of the text
answer instead, skipping that schema for the rest of the page load). Under **Settings › AI features** (behind
**Use your own keys** when the site has a
built-in proxy) paste an Anthropic API key, or a proxy URL: with a
key the browser calls `api.anthropic.com` directly and the key is stored only in this browser's localStorage and
sent only to that host; with a proxy URL the request goes there unchanged, without the key, and the proxy adds its
own (an optional proxy token travels as a bearer header so the proxy can refuse strangers). Nothing is sent until
you take a photo or generate a plan, and only what those need is sent: the resized photo, or the plan answers and
the scoring profile in words (the menu scanner sends only the photo; the ranking happens on the phone). Estimates are the model's best guess and are marked
as such everywhere they appear; History counts them on their own Photo estimates row and never inside the database
counts. Each call costs money on your
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
  look for. A custom profile does not replace the score: every food keeps the standard quality score above, and your
  preferences move it by at most 25 points either way. Each of eleven factors (net carbs, sugars, fiber, protein,
  saturated fat, total fat, sodium, calories, NOVA processing, additives, organic) gets a weight from 0 to 5 and a
  0–100 sub-score from its per-100 g value against the chosen cut-offs (drinks, whose data is per 100 ml, use the
  roughly half-size FSA drink cut-offs, scaled the same way for strict preferences), and the weighted average of how
  far those sub-scores sit from the middle is what the 25 points are shared out by. A factor with no data counts as
  neutral rather than dropping out, so what is missing cannot make the rest count for more than it should; below half
  coverage the whole tilt is damped in proportion. Three rules keep whole food out of trouble:

  - Anything you asked for **more** of only ever adds points, never takes them away. Because raising the bar on a
    bonus could only shrink it, those picks are scored against the same scale for everyone and your preference level
    sets only how much the factor counts (weight 1, 3 or 5). A limit is the other way round: a strict limit halves the
    cut-offs, which is what makes the penalty bite.
  - **More protein** and **more fiber** are judged **per 100 calories** rather than per 100 g — nutrient density,
    which is why broccoli beats milk on protein. Full marks at 10 g of protein or 3.5 g of fibre per 100 kcal, none at
    3 g and 1 g: the reference intakes are about 2.5 g and 1.5 g per 100 kcal, so the scale runs from below the
    guideline to comfortably above it. The denominator never drops below 20 kcal per 100 g, so a food that is mostly
    water cannot read as concentrated.
  - A limit pays only 30% of its upside, so a food does not ride up merely for lacking sugar.
  - A bonus a food did not earn counts as neutral rather than being averaged in — otherwise asking for more protein
    would halve the sugar penalty on a sugary bar that has none.
  - A single-ingredient whole food (NOVA 1, no additives, no added sugar in the ingredients) pays nothing against a
    sugar limit for up to 20 g of its own sugar per 100 g: the sugar in fresh fruit is not added sugar. Only sugar is
    forgiven, and only in a food — rolled oats are still a pile of carbohydrate to someone counting them, dried and
    concentrated fruit carry several times what fresh does, and a drink's sugar counts whatever it was pressed from.

  The result names the three factors that moved the score most in plain words ("High in sugar", "Much less fiber than
  you want", "Ultra-processed") with the value next to each and a green or red dot for whether it helped or hurt, and
  **How the score adds up** lists every factor with its value, its cut-offs, its 0–100 marks and its weight, then
  shows the arithmetic ("Worked out: quality 35, then net carbs −9, sugar −9, fiber ±0, processing −3,
  additives +1 = 15"). Those per-factor points are shared out from the movement the score actually made, so they add
  up even where the scale runs out at 0 or 100, which the card says when it happens. Weights can be fine-tuned under
  **Adjust weights** (custom profiles only). A profile adjusts a quality score, so when nothing is known about a
  food's quality there is no score at all, however well the things you asked about do.
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
- Bands: Excellent 75–100, Good 50–74, Poor 25–49, Bad 0–24. A "low confidence" note appears when the nutrition data
  behind the quality score is missing, or when a custom profile had to score a food on preferences alone.
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
  the result is matched on `gtinUpc`. Without a key the same search goes to the built-in proxy's
  `/usda/foods/search` when the site has one (the proxy adds its own key; a proxy that answers 404 has none, and
  USDA is skipped for the rest of the page load); with neither, USDA is never called.
- Opening the app as `https://bkbolnick.github.io/FoodScanner/#usda=YOURKEY` saves that key on load. The part after
  `#` is never sent to any server, so the key stays off GitHub and off GitHub Pages, but the link itself contains
  it, so don't share it. Because a Home Screen icon made from that link re-saves the key on every launch, it also
  survives Safari's 7-day storage purge.
- **Reading the label yourself.** Open Food Facts and USDA between them often have only a name and a brand, and a
  product with no nutrition and no ingredients cannot be scored at all. When a card is missing any of the six tracked
  fields it offers **Photograph the nutrition panel** and **Photograph the ingredients list**; the AI copies what is
  printed (it is told never to estimate a figure that is not on the label, and to say so when the shot is unreadable)
  and the result is kept against that barcode in this browser, under its own key, so refreshing the lookup never
  throws it away. It is merged **after** both databases, so it fills gaps and never overrules a curated record, and it
  is the last thing consulted for allergens: the printed list stands in only where neither database has an allergen
  list or any ingredient text of its own. The panel brings calories, carbs, sugar, fibre, protein, fat and sodium
  (either column, scaled by the printed serving weight when the panel gives one); the ingredient list brings the
  ingredients, the additives, the allergens and the "may contain" advisory, the vegan / vegetarian / palm-oil reading
  and the NOVA group — which is what lets the quality score count its additives and processing components. **Remove
  what I added** on the card puts the product back as the databases have it. Sixty products are kept, oldest dropped
  first; nothing is uploaded to Open Food Facts or anywhere else.
- Every lookup that Open Food Facts answered (found or not found) is cached in localStorage keyed by barcode, so
  repeat scans are instant and offline. Open Food Facts network errors are not cached; a failed or skipped USDA
  query is retried on a later lookup of the same code. **Refresh** on a card bypasses the cache.
- Everything (cache, log, tally, settings, recent menus, labels you photographed, the plan and the planner answers) lives in the browser's
  localStorage. Nothing is sent to any server other than the two data sources, the site's built-in proxy (every
  barcode you scan goes there as a USDA search when no USDA key is saved, and the AI requests go there when no key
  or proxy of your own is saved) and, when you use them, the AI service or a proxy you saved.
- Safari can delete a site's localStorage after 7 days of Safari use without visiting the site, so export the log
  now and then if the numbers matter to you.
- Added to the Home Screen, the app runs in standalone mode (`display: standalone` in `manifest.json`). iOS has
  supported the camera in Home Screen web apps since 13.4, but some versions ask for camera permission again on
  every launch and there is no reload button; if the camera misbehaves there, open the page in Safari instead. The
  manifest deliberately has no `start_url`, so an icon made from a `#usda=…`/`#profile=…` link keeps that link.
- Open Food Facts data is © Open Food Facts contributors, ODbL. USDA FoodData Central data is public domain.

## Look

The app is set in the device's own UI face (`-apple-system`, which on an iPhone is SF Pro) and makes no third-party
request of any kind — no webfont, no CDN, no analytics — so the only hosts it ever talks to are the two food
databases and, for the AI features, the site's proxy or whatever you saved yourself.

The ground is paper with a faint green bias and the accent is a deep teal, which frees red, amber and green to mean
one thing only: a score. Four score colours (bad, poor, good, excellent) appear as the numeral, as a tinted band
pill, as the severity stripe beside each reason, as the marker on the quality-and-preferences track, and as the
rounded square that leads every row in History — never as a button or a link.

Data surfaces borrow the one document this subject owns, the printed nutrition panel: a small-capitals heading over a
heavy rule, hairlines between the rows, figures right-aligned in tabular numerals. Only the nutrition table and the
score breakdown get that treatment; everything else stays a quiet inset list. Section headings are small capitals
rather than an uppercase transform, so the words a screen reader is handed are the words on the page.

Both themes are designed, not inverted, and every colour is checked to 4.5:1 for normal text against the surface it
actually sits on. The layout is verified from 320 px wide up, at the root font sizes iOS Dynamic Type produces
(17 to 34 px), with nothing clipped and no sideways scroll.

## Development

Serve the folder over HTTPS or localhost (camera access needs a secure context), e.g.
`python3 -m http.server 8000` and open http://localhost:8000/. Append `?code=049000028911` to the URL to run a
lookup on load. `window.FS` exposes the lookup, scoring, estimate, plan and article functions for debugging from a
desktop console. The Playwright test harness lives outside the repo; it mocks the two databases and the Claude
endpoint (including streamed answers), so no key is needed to run it.
