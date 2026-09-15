# Design system

The product is a writing instrument, not a dashboard. Everything below follows
from one line in the spec:

> **The script is the page.** Editor chrome, panels, and actions recede; the
> script text is the largest, highest-contrast element on screen. — §8.5

The first version of this UI violated that. The script sat in 15px sans-serif
inside bordered cards, at full container width, surrounded by badges competing
for attention. This is the correction.

---

## Three rules

### 1. Hierarchy comes from size, colour and space — never weight

The UI ships **two** font weights: 400 and 500. Nothing is 600 or above.

When everything important is bold, nothing is. A page of competing bold text
reads as flat, and the usual fix — making the important thing *bolder* — starts
an arms race that ends with six weights and no hierarchy at all. Size, colour
and whitespace do the work instead, and they scale without limit.

### 2. One chromatic accent

`--accent` carries the brand mark, focus rings, and **one primary action per
view**. There is no second decorative colour and no gradient on a card.

The single exception is authorship, because the spec requires AI-written and
creator-written text to be distinguishable at a glance (§8.6). Even there it is
a 2px left rule plus a written label — never colour alone, so it survives both
colour blindness and a greyscale print.

### 3. Tracking ramps with size

Large type set at default tracking is the most common reason an interface looks
amateur. Every step of the scale carries its own letter-spacing, from `+0.02em`
at 11px down to `-0.03em` at 44px.

---

## Typography

| Role | Face | Size | Leading | Measure |
| --- | --- | --- | --- | --- |
| Script body | Newsreader Variable (serif) | 18px | 1.72 | ~66 characters |
| UI | Inter Variable | 13–14px | 1.5 | — |
| Display | Newsreader Variable | 26–44px | 1.06–1.22 | — |

**Why a serif for the script.** These are words that will be spoken aloud. A
serif reads as manuscript; a sans reads as interface. Setting the draft in the
same face as every form field on the page tells the creator it is a form field.

**Why ~66 characters.** Research converges on 50–75 characters per line at
1.5–1.7 leading. Past roughly 75 the eye loses the start of the next line; under
45 it jumps too often. The `.measure` class caps the script column, and the
workspace container is sized to *measure + rail + gap* — not to the viewport,
which would leave a dead gutter between the script and the rail.

Fonts are **self-hosted** via `@fontsource-variable`. No CDN: the app must render
identically offline, and a flash of fallback text is the first thing anyone
notices in a writing tool.

---

## Colour

Every colour is a CSS variable in `client/src/index.css`, consumed by Tailwind
through `hsl(var(--token) / <alpha-value>)`. Light and dark are one set of
classes, not two.

- **Surface ladder** — `bg`, `surface`, `surface-raised`, `surface-sunken`.
  Depth comes from elevation, not from drawing more boxes.
- **Text ramp** — four steps. The darkest is deliberately short of black;
  `#000` on `#fff` is harsh over long stretches of reading.
- **Hairlines** — low-opacity strokes, never solid mid-greys.
- **Semantic only** — `ai`, `creator`, `warn`, `danger`. Used for meaning, never
  for decoration.

Dark mode is not a bonus. This is a tool whose core surface is a wall of text,
and writers work at night. The theme is resolved by a blocking script in
`index.html` *before first paint* — decided in a React effect instead, every
dark-mode user gets a white flash on every load.

---

## Motion

One curve, `cubic-bezier(0.22, 1, 0.36, 1)`, and one duration, 160ms. Things
decelerate and settle; nothing bounces. `prefers-reduced-motion` disables all of
it.

Loading uses **skeletons, not spinners**. A spinner says "something is
happening". A skeleton says "this much content is coming, in this shape", which
stops the layout jumping when it lands.

Generation progress names its phases and the last phase **holds** rather than
completing — a bar that fills to 100% and then waits is a lie everyone has
learned to read. Retrieval is only listed when retrieval actually ran.

---

## Component rules

- **No box-in-box.** A panel is a hairline and a surface. Rail sections are a
  heading and content — cards in a sidebar make it look as heavy as the thing it
  annotates.
- **Section chrome appears on hover and focus**, never permanently. Always in
  the DOM so it is not announced as appearing and disappearing.
- **Textareas grow to their content.** A scrollbar inside a paragraph breaks the
  illusion that this is a document.
- **Disabled buttons state the reason in words.** A grey button with no
  explanation is the most common small cruelty in software.
- **Empty states are a sentence and one action**, not a grid of zeroes.
- **Errors are plain language + reason category + retry.** Never a stack trace,
  never a raw provider error. The error code is present but demoted — it is for
  the bug report, not the creator.

---

## Accessibility

- One focus treatment: a 2px accent ring, `:focus-visible` only, so a mouse
  click never leaves a ring behind.
- Authorship, status and check results always pair colour with an icon or a
  word.
- Generation start and completion announce through a live region.
- Rating dots are outlined when empty — a dim *filled* dot disappears against
  either theme and the control reads as missing.
- The script column reflows to a single column and never scrolls horizontally.

---

## Things that went wrong, and what they taught

**A stale Tailwind config served silently.** Custom colour classes were never
generated, so `bg-accent` computed to `transparent` and the primary button
rendered invisible on white. Nothing errored. The lesson: verify a design change
in the browser with computed styles, not by reading the source — `getComputedStyle`
would have caught it in one call.

**`duration-DEFAULT` is not a class.** With `transitionDuration.DEFAULT` set, the
bare `transition` utility already carries the duration; the suffix silently did
nothing on 15 elements.

**The header trusted the model's self-reported duration.** It read "8m estimated"
beside a check that measured 4m 44s for the same script — the model returns the
duration it was *asked* for. Duration is now measured from the words on screen
at 150 wpm, so it agrees with the checks and updates as the creator edits.

**A "last two weeks" chart rendered only the days that had data.** One busy day
filled the full width and read as a solid block. The window is built first, then
the data dropped into it.
