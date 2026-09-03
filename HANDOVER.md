# Handover — start here

You are picking up a small role-playing game for a six- or seven-year-
old, in which the fighting is arithmetic and nothing is ever lost.

Read **[KONZEPT.md](KONZEPT.md)** for what it is and why, then
**[AGENTS.md](AGENTS.md)** for how to work, then **[PLAN.md](PLAN.md)**
for what is next. This file is the ninety-second version.

---

## Where this came from

There is a previous project at `C:\Development\Lernkiste` — **LernInseln**,
live at <https://patrickgod.github.io/lerninseln/>. It works: islands,
houses, ten-question rounds, real German first-grade content, an
ElevenLabs voice, finger-tracing for handwriting. It is not abandoned.

Then Patrick played it with his son, and two things came out of one
session:

* **Collecting worked.** Stars, sweets, coins.
* **Building did not.**

Funkelwelt is the answer to *why*, and the answer is not "building is
boring". It is that building was a **second job**: a child who has just
answered ten questions was handed a shop, a catalogue and an empty
meadow, and asked to make an aesthetic decision. A blank page.

An RPG replaces it because **an RPG's core loop already is the learning
loop** — meet something, use what you know, get stronger, reach harder
places. Not a theme over a quiz; the same shape.

## The one thing you must not break

**Damage goes one way. A wrong answer must never cost the child
anything.**

An RPG framing will keep trying to undo this — health bars, defeat,
penalties — because that is what RPGs do. Applied to a maths question it
says *not knowing this hurts you*, which is the exact lesson that makes
a child decide at seven that they are bad at maths.

So there is no health bar. There is **Mut**, which only ever fills.
Shadows are pushed back by right answers and **do nothing** on wrong
ones. They are chased away, never killed. Nothing is ever taken away.

## Where the code is

```
src/core/     palette, pixel buffer, storage, save slots, audio, fx, i18n
src/spiel/    held.ts — the adventurer, drawn in code
src/main.ts   title screen, character editor, and a stub for the world
tools/        build, verify, shot, contact, icons
```

Everything is drawn in code on a closed palette. Nothing is an image
file except the generated PWA icons.

```
npm install
npm run build      # typechecks, then bundles into dist/
npm run serve      # http://localhost:8323
npm run verify     # the suite, at iPad size, with taps
node tools/shot.mjs      # screenshots into shots/
node tools/contact.mjs held   # the adventurer, every direction and frame
node tools/iconsheet.mjs      # the home-screen icon at the sizes iOS draws
node tools/devlog.mjs         # reassemble DEVLOG.md from devlog/*/article.md
```

Pushing to `master` deploys to <https://patrickgod.github.io/funkelwelt/>
if the suite passes.

## What is built

Title screen with three save slots, and a character editor with live
preview. That is all. It is deployed and playable on an iPad, and it
is deliberately where the project stops until the world exists.

## What to do next

**Build the walkable world and play it.** PLAN.md item 1, and the
reason it is item 1 is written there: if the walking is not fun on its
own, it is a corridor between quizzes and worse than a menu — and that
is much cheaper to discover now than after four dungeons are built on
top of it.

Then port `src/games/*` from LernInseln wholesale. The teaching is
already built and already tested. This project is a new *frame* around
it, not a new app.

## Things worth knowing before you start

* `LEARNINGS.md` in `C:\Development\Lernkiste` is a list of mistakes
  that have already been paid for. Reading it is fifteen minutes and
  will save more.
* The Bash heredoc in this environment eats backslashes and breaks on
  apostrophes. Anything with a regex or an English possessive goes
  through a file write, not a heredoc.
* A failing `tsc --noEmit` means `dist/` was **not** rebuilt. Twice on
  the last project a measurement was taken against a stale bundle and
  believed.
* The ElevenLabs key is at `c:/development/fallennights2d/.env` and
  needs the `text_to_speech` permission, which it now has.

## The written record

`README.md` is the front door. `DEVLOG.md` is the diary — two entries so
far, the second of which explains why this project exists — and it is
**generated** from `devlog/*/article.md`, so edit those and rerun
`node tools/devlog.mjs`. `DEVLOG-STYLE.md` is the house style and is
worth reading before adding an entry: three strands always, keep the
wrong turns in, and numbers are measurements rather than estimates.

## Open questions for Patrick

Ask; do not assume.

1. **Touch steering.** Virtual stick under the thumb, or tap-to-walk?
   Worth building both and letting his son decide in ninety seconds.
2. **Luma's artwork.** He wants to make her with Gemini. What size, and
   how many expressions — one, or happy/thinking/pleased?
3. **How big is the first region?** Small enough to learn by heart is
   the design goal, but "small" has not been given a number.
4. **Does the son want to be the character, or someone else?** It
   changes how the editor should be framed.
