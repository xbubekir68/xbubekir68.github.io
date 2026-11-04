---
name: Mufradaat
description: Hocharabisch für Deutschsprachige – a winding learning road on warm paper, inked in deep garden green.
colors:
  deep-garden-green: "#1f6f55"
  fresh-garden-green: "#2f8f6f"
  garden-mist: "#dcefe5"
  on-green: "#ffffff"
  warm-primer-paper: "#f6f3ec"
  card-cream: "#fffdf9"
  garden-ink: "#1c2a24"
  sage-grey: "#5a6760"
  sand-hairline: "#e6e1d5"
  brick-red: "#b0402e"
  brick-blush: "#f7dfd9"
  night-path-violet: "#231a45"
  path-lilac-glow: "#c98bff"
  dusk-violet: "#5a49a6"
  star-saffron: "#e0a82e"
  shaky-amber: "#c99a2e"
  spark-gold: "#e8b64c"
  begun-chip: "#f3e6c4"
  begun-chip-ink: "#6b5210"
  dusk-sand: "#f2cf9f"
  dusk-sand-light: "#ead9bd"
  dusk-pine-light: "#2d7059"
  dusk-pine: "#0f3a2c"
  dusk-pine-ink: "#12332a"
  wordmark-line: "#0b3d2e"
  confetti-sky: "#2f6fa8"
  neon-glint: "#c4ffe9"
  night-mint-neon: "#3dffb5"
  deep-garden-green-dark: "#3aa57f"
  fresh-garden-green-dark: "#4fbd95"
  garden-mist-dark: "#1d3a2f"
  on-green-dark: "#0b1511"
  night-garden: "#111a16"
  card-night: "#18241f"
  moonlit-ink: "#e8efe9"
  sage-grey-dark: "#93a39a"
  night-hairline: "#26352e"
  brick-red-dark: "#e27a68"
  brick-blush-dark: "#3a1f1a"
  night-path-violet-dark: "#21193f"
  path-lilac-glow-dark: "#d4a0ff"
  dusk-violet-dark: "#cdb8ff"
  begun-chip-dark: "#3a3217"
  begun-chip-ink-dark: "#e8c970"
typography:
  arabic-1:
    fontFamily: "Noto Naskh Arabic, Geeza Pro, Segoe UI, Traditional Arabic, Arial, serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.4
  arabic-2:
    fontFamily: "Noto Naskh Arabic, Geeza Pro, Segoe UI, Traditional Arabic, Arial, serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.5
  arabic-3:
    fontFamily: "Noto Naskh Arabic, Geeza Pro, Segoe UI, Traditional Arabic, Arial, serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.5
  arabic-4:
    fontFamily: "Noto Naskh Arabic, Geeza Pro, Segoe UI, Traditional Arabic, Arial, serif"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: 1.5
  arabic-5:
    fontFamily: "Noto Naskh Arabic, Geeza Pro, Segoe UI, Traditional Arabic, Arial, serif"
    fontSize: "64px"
    fontWeight: 500
    lineHeight: 1.4
  arabic-6:
    fontFamily: "Noto Naskh Arabic, Geeza Pro, Segoe UI, Traditional Arabic, Arial, serif"
    fontSize: "96px"
    fontWeight: 500
    lineHeight: 1.4
  numeral:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "30px"
    fontWeight: 700
  headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "26px"
    fontWeight: 700
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
  button:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  body-small:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  overline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.12em"
rounded:
  hair: "2px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "16px"
  2xl: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  stack: "10px"
  md: "12px"
  lg: "16px"
  gutter: "24px"
  nav-clearance: "110px"
components:
  button-primary:
    backgroundColor: "{colors.deep-garden-green}"
    textColor: "{colors.on-green}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "15px"
    width: "100%"
  button-secondary:
    backgroundColor: "{colors.garden-mist}"
    textColor: "{colors.deep-garden-green}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "15px"
    width: "100%"
  button-cta:
    backgroundColor: "{colors.deep-garden-green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.xl}"
    padding: "16px"
    width: "100%"
  link-button:
    textColor: "{colors.deep-garden-green}"
    typography: "{typography.body-small}"
    padding: "8px 0 2px"
  card:
    backgroundColor: "{colors.card-cream}"
    rounded: "{rounded.xl}"
    padding: "16px"
  menu-item:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.garden-ink}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  menu-item-primary:
    backgroundColor: "{colors.deep-garden-green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  word-row:
    backgroundColor: "{colors.card-cream}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  chip:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.garden-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.pill}"
    padding: "11px 16px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.deep-garden-green}"
    textColor: "{colors.on-green}"
  input:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.garden-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "13px 14px"
  answer-option:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.garden-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "15px"
  answer-option-correct:
    backgroundColor: "{colors.garden-mist}"
  answer-option-wrong:
    backgroundColor: "{colors.brick-blush}"
  word-tile:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.garden-ink}"
    typography: "{typography.arabic-3}"
    rounded: "{rounded.lg}"
    padding: "6px 16px"
    height: "48px"
  word-tile-placed:
    backgroundColor: "{colors.garden-mist}"
  keyboard-key:
    backgroundColor: "{colors.card-cream}"
    rounded: "{rounded.sm}"
    padding: "8px 0"
  streak-pill:
    backgroundColor: "{colors.garden-mist}"
    textColor: "{colors.deep-garden-green}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  status-learned:
    backgroundColor: "{colors.garden-mist}"
    textColor: "{colors.deep-garden-green}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  nav-tab:
    textColor: "{colors.sage-grey}"
    typography: "{typography.label}"
    height: "48px"
  nav-tab-active:
    textColor: "{colors.deep-garden-green}"
  nav-path-orb:
    backgroundColor: "{colors.night-path-violet}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.pill}"
    size: "46px"
  nav-path-orb-active:
    textColor: "{colors.path-lilac-glow}"
  path-stop:
    backgroundColor: "{colors.card-cream}"
    textColor: "{colors.deep-garden-green}"
    rounded: "{rounded.pill}"
    size: "58px"
  path-stop-done:
    backgroundColor: "{colors.deep-garden-green}"
    textColor: "{colors.on-green}"
  path-stop-current:
    size: "76px"
  goal-sign:
    backgroundColor: "{colors.card-cream}"
    rounded: "{rounded.2xl}"
    padding: "10px 14px 12px"
  toast:
    backgroundColor: "{colors.deep-garden-green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
---

# Design System: Mufradaat

## Overview

**Creative North Star: "The Winding Road"**

Learning Arabic is a journey you walk one stop at a time. The learning path (Lernpfad) is the literal heart of the app: a road that winds down the screen. Each unit has its own landscape and its own road surface, every stop shows an Arabic word, and each unit ends at a sign carrying its goal sentence. Everything around the road is calm and quiet: warm primer paper, cream cards, deep garden green ink. The journey supplies the colour, and the rest of the app is the resting place between stretches.

The system is mobile-first and single-column. It is dense with Arabic and light on chrome. The Arabic script is always the largest, most legible thing on screen, set in a real Naskh face, never treated as decoration. German UI text is plain system sans that stays out of its way. Components are **playful and bouncy**. Buttons are pills, cards are soft. Correct answers pop and pulse, wrong ones shake, and stars, confetti and a level-up badge make each step forward a small celebration. All of it switches off under reduced motion.

There are two moods. The start screen is a dusk sky fading from sand to pine green behind a mosque silhouette, with the calligraphic wordmark. The splash at launch is night garden dark, with the wordmark revealed letter by letter in neon mint. Inside the app, light and dark themes mirror each other token for token.

Four looks are ruled out on purpose: cartoon mascots, decorative ornament such as arabesques and lanterns, Arabic used as decoration, and hearts or lives. The other guardrails below come from what the shipped app does.

**Key Characteristics:**
- One road, many landscapes: the path carries the colour, the rest of the app stays neutral.
- Arabic first: Noto Naskh Arabic, large sizes and generous line height, so vowel marks never clip.
- One green for action and success, one brick red for errors, violet only for the path.
- Flat, tonal surfaces with hairline borders. Shadows only for things that float.
- Bouncy, celebratory feedback that is fully disabled under `prefers-reduced-motion`.
- Complete light and dark themes, following the system or set manually.

## Colors

A warm, earthy neutral base (paper, cream, sand, sage) under a single deep green. Brick red marks errors, and a night violet belongs to the path alone.

### Primary
- **Deep Garden Green** (deep-garden-green): the one action and success colour. Used for solid buttons, the active tab, progress rings and bars, finished path stops, the selected chip, toasts, and the border of correct answers. In dark mode it brightens to deep-garden-green-dark.
- **Fresh Garden Green** (fresh-garden-green): the lighter partner. Used for the focus ring (3px outline, 2px offset), the level-up ring, and, in dark mode, the text of secondary buttons.
- **Garden Mist** (garden-mist): green as a soft surface. Fills secondary buttons, correct-answer fills, the streak pill, the "learned" status chip, numbered rule bullets, and the halo around the current path stop.

### Secondary
- **Night Path Violet** (night-path-violet): the orb behind the Lernpfad tab, wrapped in a 5px card-coloured ring.
- **Path Lilac Glow** (path-lilac-glow): the orb's icon colour and neon glow when the path tab is active.
- **Dusk Violet** (dusk-violet): the Lernpfad tab's label.

### Tertiary
- **Star Saffron** (star-saffron, `--star`): earned stars. Related golds:
  - **Shaky Amber** (`--amber`): the "wackelig"/"fällig" memory bars and progress pips.
  - **Spark Gold** (`--spark`): level-up sparks and confetti.
  - **Begun Chip** (`--chip-s` on `--chip-s-ink`, with dark variants): the "begonnen" status chip.
- **Start screen:** the dusk gradient runs `--dawn` → `--dawn2` → `--pine` → `--pine2`, with `--pine3` text. The wordmark outline is `--wm-line`.
- **Confetti** reads its colours from the tokens (`--g`, `--spark`, `--bad`, `--g2`, `--dawn`, `--sky`). Fixed hex values outside `:root` are not allowed; pure black/white only appears in masks.
- **Dusk Sand → Dusk Pine** (dusk-sand, dusk-pine): the start-screen sky gradient (#f2cf9f → #ead9bd 36% → #2d7059 80% → #0f3a2c) and the mosque silhouette, with text in #12332a. The wordmark gets a 1px #0b3d2e outline in light contexts.
- **Night Mint Neon** (night-mint-neon): the splash screen's glow, halo, ring and loading shuttle. In dark mode it is echoed by the level ring's gradient end (#3dfbb3).

### Neutral
- **Warm Primer Paper** (warm-primer-paper): the page background in light mode.
- **Card Cream** (card-cream): every card, list row, tile, input and the bottom nav. It sits one tone above the paper.
- **Garden Ink** (garden-ink): primary text, a green-black rather than pure black.
- **Sage Grey** (sage-grey): secondary text, captions, inactive tabs and locked stops.
- **Sand Hairline** (sand-hairline): 1px borders, dividers, empty bar tracks and the ring track.
- **Brick Red / Brick Blush** (brick-red, brick-blush): wrong answers, error messages, the record button, the "no Arabic voice" hint border, and forgotten memory bars.
- **Dark theme**: night-garden page, card-night surfaces, moonlit-ink text, sage-grey-dark, night-hairline, and the *-dark variants of green, mist, brick and violet.

### Named Rules
**The One Green Rule.** Deep Garden Green is the only colour that means "do this" or "correct". Never introduce a second action colour.

**The Path Owns Violet Rule.** Night Path Violet and its lilac glow belong to the learning path, and they may appear wherever the path appears: its tab, entry points, the current stop, path highlights. Nothing unrelated to the path is ever violet.

**The Mirrored Theme Rule.** Every colour token exists in light and dark. Dark values are declared twice: under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and under `:root[data-theme="dark"]`.

## Typography

**Arabic Font:** Noto Naskh Arabic, self-hosted at weights 500 and 700 (falls back to Geeza Pro, Segoe UI, Traditional Arabic, Arial, serif)
**UI Font:** system-ui (falls back to -apple-system, Segoe UI, Roboto, sans-serif)

**Character:** A classical Naskh with full vowel-mark support carries all Arabic, while the UI speaks in the phone's own sans. The script is the star, and the German is the friendly guide beside it.

### Hierarchy
- **Arabic scale:** All Arabic uses one of six steps (weight 500). In code they are the CSS variables `--ar1` to `--ar6` and the helper classes `.as1` to `.as6`. Pixel sizes for Arabic are not allowed.

| Step | Size | Line height | Use |
|---|---|---|---|
| `--ar1` | 20px | 1.4 | Only inside small round shapes: long words on path stops, level and badge circles, the preview list |
| `--ar2` | 24px | 1.5 | Running text and lists: word-list rows, Arabic inside tips and feedback, the Arabic input |
| `--ar3` | 30px | 1.5 | Tiles and answers: Arabic options, builder tiles, pairs, Etappe and unit names, goal sentences on signs |
| `--ar4` | 44px | 1.5 | Featured words: the next stop on Start, letter forms, the goal sentence inside a lesson, the tip-card header |
| `--ar5` | 64px | 1.4 | Display: flashcard, lesson word, Wort-Blitz and quiz word |
| `--ar6` | 96px | 1.4 | Single letters and vowel signs |

Multi-word lines may go up to line height 2. Arabic inside a German sentence can use `em` (for example 1.4em) instead of a step.
- **Headline** (700, 26px): screen titles ("Lernpfad", "Ahlan wa Sahlan!").
- **Numeral** (700, 30px): big progress numbers. The overview card goes up to 32px.
- **Title** (700, 20px): sub-screen titles beside the back button.
- **Body** (400, 16px): default UI text, answer options and buttons (600).
- **Body Small** (400, 14px, line-height 1.45): muted explanations, hints and notes.
- **Caption** (400, 13px): sub-lines in menu items and transliterations.
- **Label** (600, 12px): bottom-nav labels (700 when active) and status chips.
- **Overline** (400, 11px, 0.12em, uppercase): the "LEVEL" label inside the level ring.

### Named Rules
**The Script Leads Rule.** Arabic is always set larger than the German next to it, using a step of the Arabic scale: at least 24px (`--ar2`), and 20px (`--ar1`) only inside small round shapes. It is always marked up with `lang="ar"` and `direction: rtl`.

**The Room for Harakat Rule.** Arabic line height never drops below 1.4, with no exceptions, and runs from 1.5 to 2 for multi-word lines. Vowel marks and pause signs must never clip. A container that is too small grows; the Arabic does not shrink below its step.

## Layout

The app is a single centred column (max 560px) with 20px top padding, a 24px side gutter, and 110px bottom padding that clears the fixed tab bar. Safe-area insets are honoured on every fixed element. Cards and menu items stack with 10px gaps. Inner card padding is 16px, and the overview card uses 28px. There are no width breakpoints. The overview card adapts through a container query at 430px, where the ring shrinks from 148px to 112px.

The bottom navigation is a fixed bar of five equal tabs, each up to 120px wide. The centre tab is the raised violet path orb, which overlaps the bar's top edge by 30px.

The learning path is an absolutely positioned canvas. Stops sit 104px apart vertically and swing sinusoidally between 24% and 76% of the width, with a different amplitude and frequency per unit, so each stretch winds differently. A unit header takes 118px and the goal sign 212px. Labels sit on whichever side of the stop has more room. Horizontal chip rows scroll edge to edge, with soft mask fades and snap points.

## Elevation & Depth

The system is flat and tonal. Depth comes from paper → cream layering and 1px sand hairlines, not shadows. Resting cards, list items and tiles never cast a shadow. Shadows appear only on things that float above the page: the sign-in pane, toasts, the update banner and the level-up badge. Glow is reserved for the violet path orb when active, the neon splash, and the level ring, which glows only in dark mode.

### Shadow Vocabulary
- **Floating pane** (`box-shadow: 0 10px 30px rgba(0,0,0,.18)`): the sign-in and registration pane over the dusk sky.
- **Floating message** (`box-shadow: 0 6px 20px rgba(0,0,0,.25)`): toasts and the update banner.
- **Badge** (`box-shadow: 0 6px 18px rgba(0,0,0,.2)`): the level-up chip that drops in from the top.
- **Current-stop halo** (`box-shadow: 0 0 0 6px var(--gl)`): a garden-mist ring around the current path stop. It reads as a halo, not as lift.

### Named Rules
**The Float-Only Shadow Rule.** If it scrolls with the page, it has no shadow. Only overlays and transient messages lift.

## Shapes

The form language is soft and round.
- **Pills** (999px): every action and every small status. That covers buttons, chips, toasts, the streak pill, status chips and toggles.
- **Rounded rectangles** for content: 16px for cards and the call to action, 14px for menu items, word rows and tiles, 12px for inputs, answer options and feedback, 8px for keyboard keys, 6px for chart bars.
- **Circles** for progress and the journey: path stops, medals, progress rings and dots.
- **Dashed borders** mean "not yet": locked path stops, and the empty sentence-building tray before it is filled.
- **The goal sign**: a 20px-rounded board with a 2px border that turns green when the unit is done.

Icons are line icons on a 24px grid with a 1.8 stroke and round caps and joins, inlined as SVG. The streak flame is the one filled icon.

## Components

### Buttons
Big, friendly, full-width pills with a 15px tap area.
- **Shape:** fully rounded (999px).
- **Primary:** Deep Garden Green on white, 16px semibold, full width, 16px above the previous block.
- **Secondary:** Garden Mist fill with green text. In dark mode the text uses the brighter green.
- **Call to action:** a 16px-rounded green block with bold 16px text, used for "N Wörter wiederholen" on the home screen.
- **Link button:** underlined green text, 14px, for low-weight actions.
- **Disabled:** 40% opacity.
- **Focus:** 3px Fresh Garden Green outline, 2px offset, on every interactive element.

### Chips
- **Style:** cream pill with a sand hairline, 14px text, minimum 44px tall, in a horizontally scrolling row with faded edges.
- **Selected:** solid green with white text.
- **Status chips:** small 12px semibold pills. Grey = new, saffron = begonnen, mist green with a check = gelernt.

### Cards / Containers
- **Corner Style:** 16px (overview card 18px, goal sign 20px).
- **Background:** Card Cream on Warm Primer Paper (card-night on night-garden in dark mode).
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** 1px Sand Hairline. Note cards use a green border with a mist fill, and hint cards a brick-red border.
- **Internal Padding:** 16px (28px for the overview card).

### Menu Items
Full-width rows: a 22–28px line icon, a bold title, a 13px sub-line and a trailing chevron at 50% opacity. Corners are 14px, with 14px × 16px padding. The **primary** item is solid green. The **"continue"** item (main2) keeps a cream fill with a green border and green icon.

### Inputs / Fields
- **Style:** cream fill, 1px sand hairline, 12px radius, 13px × 14px padding, inherits the 16px body font.
- **Focus:** the shared 3px Fresh Garden Green outline.
- **Arabic input:** uses the Arabic font at `--ar2`, with an on-screen Arabic keyboard: a 7-column RTL grid of `--ar2` Naskh keys with 8px corners.

### Answer Options
Stacked full-width options with 12px corners, a 1.5px sand border and 15px padding. **Correct** turns mist green with a green border, pops, and pulses a green ring outward (0.55s). **Wrong** turns blush with a brick border and shakes 7px left and right (0.35s). Arabic options are centred at 26–34px.

### Navigation
A cream bar fixed to the bottom with a hairline top border. It has five tabs (Start, Spiele, Lernpfad, Karten, Mehr), each a 20px line icon over a 12px label. Inactive tabs are sage grey, and the active tab is green and bold. The centre **Lernpfad** tab is a 46px night-violet orb raised out of the bar. When active, its icon turns lilac, scales in (0.9 → 1.12 → 1) and gains a neon drop-shadow glow. Sub-screens use a top row with a 44px back arrow and a 20px title.

### The Winding Road (Signature Component)
The learning path is drawn as an SVG road of 30px stroke over each unit's landscape band, with footprints along the finished stretch. Each unit has its own theme, made of a road surface, an edge, an accent and a footprint colour, with a matching dark set:

| Theme | Unit (Arabic header) | Road | Accent |
|---|---|---|---|
| Schrift | Letters | pale paper with a tan edge | #6b5a3e |
| th0 | First steps | sand | #8a5a1c |
| th1 | At school | white with a blue edge | #2c5a8f |
| th2 | At home | terracotta | #a14e2e |
| th3 | Food & drink | saffron | #93540a |
| th4 | Numbers & colours | sky blue, with rainbow segments | #5b3fa0 |
| th5 | On the road | asphalt with a white edge | #37474f |
| th6 | Nature & animals | earth with a grass edge | #3f7a2a |
| th7 | Time & body | night blue | #2f4a8a |
| th8 | Verbs | brick red | #a33a24 |
| th9 | Daily life | stone | #6d5a3d |

- **Stops:** 58px circles with a 3px accent border on cream, showing the stop's own Arabic word at `--ar2` (long words at `--ar1`). If a word is too wide, the circle grows into a pill instead of clipping it. **Done** stops are solid green with a check. The **current** stop grows to 76px, shows the app icon (a mint-green Mim on a night-garden disc), and carries the garden-mist halo. **Locked** stops use a dashed border at 50% accent, with muted text.
- **Unit header:** the Arabic unit name at 30px in the accent colour, then "Einheit N · Title" and a 13px description.
- **Goal sign:** the unit's longest sentence in Naskh at `--ar3`. Words already begun turn green and unknown ones are muted. Below it sit the German translation, a listen link and a "Sätze üben" button.
- **Provisional:** the new course will cycle these ten surfaces and give each part of stage 2 its own accent colour.

### Celebration Layer
Toasts pop in as green pills at the top of the screen. Level-ups are a green badge that drops in with a ring burst and saffron sparks. New badges and passed tests set off confetti, with a sound and a short vibration. Results show up to three stars that spin in one by one. The streak flame flickers once you have practised today. Progress rings fill in over 0.9s, and bars ease to width over 0.5s. Under reduced motion all of it stops, and the final state shows instantly.

## Do's and Don'ts

### Do:
- **Do** set every Arabic string in Noto Naskh Arabic with `lang="ar"`, on a step of the Arabic scale (`--ar1` to `--ar6`), with line height of 1.4 or more.
- **Do** use Deep Garden Green for the single strongest action and for every "correct" or "done" state, and Garden Mist for its quieter partner.
- **Do** keep surfaces flat: cream card on warm paper, 1px Sand Hairline, 14–16px corners.
- **Do** make actions and small statuses pills (999px).
- **Do** use night violet and lilac glow for anything that belongs to the learning path, and only for that.
- **Do** give every unit or section of the path its own road theme from the palette above, with a matching dark set.
- **Do** celebrate progress with bouncy motion (pop, pulse, stars, confetti, level-up badge), and disable all animation under `prefers-reduced-motion`.
- **Do** keep touch targets at 44px or more (chips 44px, back button 44px, tabs 48px, tiles 48px).
- **Do** define every new colour in both themes, in both the media query and the `[data-theme="dark"]` block.
- **Do** draw icons as 24px line SVGs with a 1.8 stroke and round joins, coloured by `currentColor`.

### Don't:
- **Don't** put shadows on resting cards, rows or tiles. Shadows are only for floating overlays and messages.
- **Don't** introduce a second action colour, or use green for anything decorative that isn't action or success.
- **Don't** use Brick Red outside of errors, wrong answers, recording and weak-memory states.
- **Don't** use violet or lilac for anything unrelated to the learning path.
- **Don't** set Arabic in the system sans, shrink it below the German next to it, or tighten its line height until vowel marks clip.
- **Don't** use emoji as interface icons. The app moved to inline SVG line icons.
- **Don't** use pure black or pure grey for text. Use Garden Ink and Sage Grey.
- **Don't** add cartoon mascots or drawn characters (people or animals) as decoration, and never near Qur'anic text. The brand marks are the Mim icon and the calligraphic wordmark, and playfulness comes from motion.
- **Don't** decorate with arabesque borders, lanterns, crescent moons or gold filigree. Ornament never frames or replaces content. Real scenes, like the mosque silhouette on the start screen, are fine.
- **Don't** use Arabic as texture, watermark or background pattern, and never show Arabic only in transliteration. Transliteration sits under the Arabic as a helper, never in its place.
- **Don't** show hearts, lives or lock-out screens. Mistakes come back at the end of a lesson; they are never punished. (The old path's heart styles in `index.html` go away when it is retired.)
