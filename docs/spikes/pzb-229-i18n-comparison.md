# PZB-229 spike: react-i18next vs Lingui

Throwaway branch `spike/pzb-229-i18n-poc`. The comparison screen is `/i18n-poc`. It is not a product route.

## What this repo actually is

The desk research assumed a Next.js App Router app and a later move to a Vite SPA. That move has already landed (`feat/vite-phase-3` is on `develop`). This spike was built on the Vite + React Router app, which is the portability target.

The i18n module under `src/i18n-poc/` does not import `next`, `next/navigation`, or `react-router`. Locale is a cookie (`gnw_locale`) plus an in-memory subscriber. The URL stays `/i18n-poc` for English, Brazilian Portuguese, and Chinese Simplified. There is no path-prefix middleware.

## Recommendation

Use **react-i18next with i18next-icu** for the implementation epic, with hand-maintained JSON catalogs in the repo. Start with the simplest setup that works and add tooling only when a concrete need shows up.

Both libraries render this screen from the same ICU JSON, and both mount as a React provider with no router glue. The reasons to prefer react-i18next:

- **No build step anywhere in the pipeline.** Catalogs are plain ICU JSON loaded as-is at runtime. Lingui in production expects `lingui compile` (and, for its idiomatic DX, a macro plugin on the whole app). With i18next, a translation is an edit to `messages/<locale>.json` and nothing else.
- **No app-wide compiler change.** The app's Vite config stays untouched. Lingui's macro path adds a Babel or SWC transform to every file that uses `t`/`Trans`.
- **It fits the agreed translation workflow** (see below). Lingui's strengths are source extraction, translator comments in `.po` catalogs, and per-string review flags. That workflow needs none of them.
- **Broader ICU coverage.** i18next-icu also accepts number skeletons that Lingui rejects. This is a margin, not the deciding factor: follow-on 6 keeps unit skeletons out of translator-facing strings anyway.

The cost is size: react-i18next + i18next-icu is about **18 KB gzip** heavier than Lingui on this screen (see Comparison). That is the honest trade.

This spike drove Lingui through its runtime API (`i18n._(id)`), not through macros plus `lingui extract`, and did not try extraction for i18next (`i18next-cli`). The developer-experience row below compares call sites and setup, not an extraction workflow. Revisit Lingui macros only if the team later moves to a translation tool or wants strings extracted from source.

## Translation workflow

Agreed with product:

- **Source.** AI produces the first Brazilian Portuguese and Chinese translation. Catalogs live in the repo (`messages/{en,pt-BR,zh-Hans}.json`); nothing is fetched from a CMS or translation tool at runtime.
- **Review.** Someone reads the whole UI on staging in each locale and flags the places where the translation is poor. Fixes land as normal PRs editing the JSON.
- **Scope order.** UI elements first: labels, buttons, placeholders, short tooltips. These are mostly one word or one short sentence, with few plurals, numbers, or dates.

What the simplest version needs:

- Descriptive, location-based keys (`map.toolbar.clearDrawing`, not `clear`). They give the AI enough context to translate one-word labels, and they let a developer find the key behind a reported string.
- A way for the reviewer to switch locale on staging (the switcher can sit behind a flag until launch).
- The existing key-parity test: every locale has exactly the keys in `en.json`.

Add only if review shows the need:

- **Key-reveal mode on staging**, if reviewers' reports are hard to map back to keys. i18next's built-in `cimode` language renders keys instead of text.
- **A list of strings nobody sees by browsing** (`aria-label`, `alt`, rare errors and empty states), if those start shipping unreviewed. The JSON exported as a sheet (key, English, translation) is enough.
- **Placeholder validation in CI**, if the AI starts translating variable names or ICU keywords (`{count}`, `plural`, `other`).
- **Pseudo-localisation**, if Portuguese text keeps overflowing buttons and chips.

## Like-for-like result

One chat-welcome facsimile (the seeded Horizon greeting, three prompts, the input placeholder, a plural, and a number/date line). Same keys in `src/i18n-poc/messages/{en,pt-BR,zh-Hans}.json`. Each engine has its own provider and call site:

- react-i18next: `t(id, values)` inside `<I18nextProvider>`
- Lingui: `i18n._(id, values)` inside `<I18nProvider>`, with `compileMessage` registered so the raw ICU JSON loads at runtime

For every string on the screen, in all three locales, both engines return the same text. Covered by `src/i18n-poc/__tests__/catalog.test.ts`. In pt-BR the sample line renders `1.234,5 hectares` and `15 de jun. de 2024` with no extra code: separators and month names come from `Intl` via the ICU `number` and `date` arguments.

One pt-BR detail for translators: CLDR puts both 0 and 1 in Portuguese's `one` plural category, so `{count, plural, one {# sugestão} ...}` alone would render "0 sugestão". The catalog uses an exact `=0` branch, and the test asserts it wins.

The screen is a facsimile, not the live chat panel. That keeps the comparison clean, but it hides the integration costs listed under "Integration findings".

## Comparison

|                                         | react-i18next + i18next-icu                                                                                                                                | Lingui 6                                                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Developer experience                    | No build plugin. Flat JSON, `keySeparator: false`, a `MessageId` union for key safety. Call sites are a function. Extraction (`i18next-cli`) not tried.    | Idiomatic DX is macros plus `lingui extract`, which needs a Babel or Vite plugin on the whole app. **Not tried here**: the spike used the runtime API so the app compiler stayed untouched. That API works, and it is less guided than macros.         |
| ICU authoring                           | Full ICU via FormatJS. Plurals, selects, `{n, number}`, `{d, date, medium}`, and number skeletons such as `{area, number, ::unit/hectare}` (`1,234.5 ha`). | Same JSON for plurals, selects, bare `{n, number}`, and `{d, date, medium}`. Number skeletons throw (`Value ::unit/hectare out of range`). A date skeleton (`::yyyyMd`) rendered differently (`6/1/24` vs `6/1/2024`).                                 |
| Bundle (minified, gzip, React external) | Engine + ICU + catalogs: **29.6 KB**.                                                                                                                      | Engine + runtime compiler + catalogs: **11.4 KB**. About **18 KB** gzip less. Production Lingui would precompile and could drop `@lingui/message-utils`; the compiler is not the bulk of that gap. `intl-messageformat` (pulled in by i18next-icu) is. |
| App Router fit                          | Irrelevant here. The app is already a Vite SPA. A provider above the tree is the whole integration.                                                        | Same. The macro plugin would be the only bundler change, and it is Vite-native, not Next-specific.                                                                                                                                                     |
| Migration cost off Next.js              | Already paid. Copying `locale.ts`, the JSON catalogs, and `createI18next` into another Vite entry does not change call sites.                              | Same for the runtime API. A macro codebase would also copy the Vite plugin config. Neither library needs a routing rewrite.                                                                                                                            |

Bundle sizes come from `node docs/spikes/pzb-229-bundle-size.mjs`: a Vite library build of each `instance.ts` (engine plus the three catalogs), minified, with `react` and `react-dom` external, then gzipped.

## Locale isolation

`resolveLocale` in `src/i18n-poc/locale.ts` is a pure function: explicit choice, then the `gnw_locale` cookie, then the browser language list, then `en`. `zh-CN` maps to `zh-Hans`. `zh-TW` does not. Any `pt` tag, including `pt-PT`, maps to `pt-BR`, since Brazilian Portuguese is the only Portuguese catalog and is readable for European Portuguese speakers. `setLocale` writes the cookie and notifies subscribers. Nothing reads the pathname.

Known gap: `matchLocale` only accepts `zh`, `zh-Hans`, `zh-CN`, and `zh-SG`. Safari and iOS can report `zh-Hans-CN`, which currently falls through to English. The real resolver should treat any `zh-Hans-*` tag as `zh-Hans`.

For client-rendered routes, the cost to do this for real is a provider at the root, this cookie module, and string replacement. No router changes. The two prerendered routes are the exception (see "Integration findings"), so "no routing work" holds for the SPA shell, not for the whole app.

## Integration findings

These are outside the facsimile, but they will drive the epic's estimates more than the choice of library.

1. **Store-held strings are frozen at module load.** The live welcome is a literal in `initialState` in `app/store/chatStore.ts`, stored as a `type: "system"` chat message. Wrapping that literal in `t()` would evaluate once, in whatever locale is active when the module loads, and switching locale afterwards would not update it. Strings that live in Zustand need to be stored as a message key (plus values) and translated at render time. The same applies to any other copy written into stores by tool handlers.
2. **Prerendered routes will hydrate in English.** `/` and `/amazonia` are prerendered to static HTML at build time and hydrated in the browser (`vercel.json` serves `amazonia.html` and `_spa.html`). If locale is resolved from the cookie on the client, a Portuguese or Chinese visitor gets an English first paint, then either a hydration mismatch or a visible swap. Options:
   - prerender one HTML file per locale and pick it with a Vercel rewrite conditioned on the `gnw_locale` cookie (`has: [{ "type": "cookie", ... }]`), which keeps URLs prefix-free;
   - hydrate in English and switch after mount, accepting the flash;
   - keep the landing pages English-only in the first phase.
3. **`<html lang>` is hard-coded.** `index.html` ships `<html lang="en">`. The spike only sets `lang` on a container `Box`. The real provider must update `document.documentElement.lang` on locale change: browsers use it to pick Han glyph variants, and screen readers use it for pronunciation.
4. **The app already resolves a language elsewhere.** `resolveSpeechLang` in `app/utils/speechLang.ts` picks the dictation language from `preferredLanguageCode` (the signed-in profile), then `navigator.language`, then `en-US`. The spike's resolver uses explicit choice, then cookie, then browser, and does not read `preferredLanguageCode`. The epic should have one resolver that both UI locale and dictation read from, with a single decision on whether the profile or the cookie wins.
5. **The agent does not know the UI locale.** Translating the interface does not change the language the agent answers in. A zh-Hans interface with English replies is likely unless the locale is sent to the backend (for example as a `ui_context` slot or a request header) and the agent prompt uses it.

## Chinese (zh-Hans)

The research blocker was `next/font` with `subsets: ["latin"]`. That API is gone. The current load in `src/app/main.tsx` is `@fontsource/ibm-plex-sans/400.css` (and 500/600/700). Those files cover Latin, Latin Extended, Cyrillic, Greek, and Vietnamese via `unicode-range`. They do not include Han. IBM Plex Sans SC is not published on Fontsource (`@fontsource/ibm-plex-sans-sc` 404s).

The spike loads `@fontsource/noto-sans-sc/chinese-simplified-400.css` and `700.css` only when the locale is `zh-Hans` and the CJK toggle is on. The panel stack is `'IBM Plex Sans', 'Noto Sans SC', sans-serif`, so Latin stays on Plex and Han falls through. The welcome eyebrow does not force IBM Plex Mono: that family has no Han glyphs, so a `font-family: mono` label would drop back to the operating system for `助手`. Each weight is a single woff2 of about **1.1 MB** (400: 1,142,552 bytes, 700: 1,172,244 bytes). Screenshot: `docs/spikes/pzb-229-zh-hans.png`.

**Evidence that Noto Sans SC draws the Han glyphs.** A screenshot alone cannot prove this on macOS: with no webfont, the OS falls back to PingFang SC and Chinese still renders. So the check was done in the page itself (`/i18n-poc`, `gnw_locale=zh-Hans`, Chrome 152 on macOS, local dev server):

- Network: both `noto-sans-sc-chinese-simplified-{400,700}-normal.woff2` files were fetched (1,116 KB and 1,145 KB).
- `document.fonts`: both `Noto Sans SC` faces (400 and 700) have status `loaded`, and `document.fonts.check('16px "Noto Sans SC"', "助手")` is `true`. The spike's `data-cjk-loaded` marker reads `yes`.
- Rendered glyphs: `欢迎使用自然监测助手` was drawn to a canvas at 40px with the panel's computed `font-family`, and compared pixel by pixel against the same text drawn with only `'Noto Sans SC'` and with only `'PingFang SC'`:

| Panel font stack                              | Differing pixels vs Noto Sans SC | vs PingFang SC |
| --------------------------------------------- | -------------------------------- | -------------- |
| `"IBM Plex Sans", "Noto Sans SC", sans-serif` | **0**                            | 6,487          |
| `"IBM Plex Sans", sans-serif` (toggle off)    | 6,487                            | **0**          |

With the toggle on, the Han glyphs are Noto Sans SC exactly. With it off, they are PingFang SC from the OS, which is the non-deterministic fallback the webfont removes. The difference is also visible in `docs/spikes/pzb-229-zh-hans-compare.png` (left: Noto Sans SC, right: OS fallback): glyph widths differ enough that the first paragraph wraps at a different word.

The product bug is real on hosts without a CJK system font, and the webfont is what makes the face deterministic. Shipping 2.2 MB on every session would be the wrong fix. Load it only for `zh-Hans`, and prefer Fontsource's unicode-range slices over the monolithic `chinese-simplified` file if the epic needs a smaller first paint.

## Follow-on tickets

### Phase 1: UI elements

1. **i18n foundation.** react-i18next provider at the root, `messages/{en,pt-BR,zh-Hans}.json`, the key-parity test, and the key naming convention (descriptive, location-based keys).
2. **Locale resolution and switcher.** One resolver for UI and dictation (replacing the split with `resolveSpeechLang`), with precedence decided between `preferredLanguageCode` and `gnw_locale`. Switcher persisted in `gnw_locale`, available on staging behind a flag for review. No locale prefix in the path. Keeps `<html lang>` in sync and matches `zh-Hans-*` tags.
3. **Font strategy.** Per-locale CJK face. Do not add Noto Sans SC to the global IBM Plex import. Stack it after IBM Plex Sans. Decide monolithic `chinese-simplified` (~1.1 MB per weight) versus unicode-range slices. IBM Plex Sans SC is not on Fontsource; self-hosting it is the option if brand consistency matters more than the pipeline. Wire it through the Chakra font tokens, not inline styles.
4. **UI string extraction and first translation.** Move labels, buttons, placeholders, and tooltips in components into the catalogs (`ChatInput`, `ChatPanelHeader`, sidebar, map controls). AI first pass for Brazilian Portuguese and Chinese, then a staging review per locale (see "Translation workflow").

### Later phases

5. **Store-held and seeded copy.** The live welcome is a literal in `chatStore`'s `initialState`; it needs to become a stored key translated at render (Integration finding 1). Sample prompts are `app/constants/welcome-prompts.json`. Markdown links inside catalog strings are what this screen does today; a rich-text `Trans` pass is a separate decision, not required to start.
6. **Number and date formatting.** One shared formatter for hectares, percents, and dates. react-i18next can keep simple ICU (`{area, number}`, `{when, date, medium}`) in catalogs. Keep unit skeletons out of translator-facing strings even though i18next-icu accepts them, so a later Lingui revisit stays possible.
7. **Prerendered landing pages.** Decide per-locale prerender with a cookie-conditioned Vercel rewrite, a post-hydration swap, or English-only landing (Integration finding 2).
8. **Agent response language.** Send the UI locale to the backend and have the agent answer in it (Integration finding 5). Needs a backend counterpart ticket.
9. **Backend and domain strings.** Error messages returned by the API, tool labels and errors in `app/lib/tool-display.ts`, and dataset names, descriptions, and legend copy that come from backend metadata. Decide which are translated client-side and which the backend must localise.

Review tooling (key-reveal mode, invisible-strings list, placeholder validation, pseudo-localisation) is not a ticket up front. Open one when review shows the need.
