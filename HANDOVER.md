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
src/core/     palette, pixel buffer, storage, save slots, audio, fx,
              i18n, icons, tenframe
src/spiel/    held.ts — the adventurer; steuerung.ts — both steerings
src/welt/     karte.ts — the region as text; kacheln.ts — every tile and
              thing, drawn in code; welt.ts — camera, lantern, walking
src/games/    the question generators, lifted from LernInseln
src/ui/       runde.ts — a round inside a house; dom.ts — the helpers
src/main.ts   title screen, character editor, world screen and its HUD
tools/        build, verify, shot, contact, icons, devlog, messen,
              genvoice
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
node tools/messen.mjs         # what it costs to open the world and to walk
node tools/genvoice.mjs       # Luma's lines, from i18n.ts, at build time
```

Pushing to `master` deploys to <https://patrickgod.github.io/funkelwelt/>
if the suite passes.

## What is built

Title screen with three save slots, a character editor with live
preview, and **a walkable world**.

The region is authored — thirty-six lines of text in `src/welt/karte.ts`
— because a world a child can learn by heart is worth more than one
that is different every time. Meadow, a path that loops rather than
dead-ends, a stream with a bridge, a pond, two woods, cliffs, and the
house whose lit door opens.

The lantern is the thing to understand before changing any of it. The
region is composited into buffers at three brightnesses, and the bright
ones are shown through a dithered disc around the adventurer and around
every lamp post. That is the whole fiction of the game — a child arrives
with a lantern and learns the world bright again — doing a job in the
level design rather than in a cutscene, and it is why the path being lit
tells a child where to go without a word of text.

Ten **lightsparks** lie off the path. You pick one up by walking into
it and it pays coins. It must never pay stars: stars are the record of
what has been learned and walking is not learning. There is a test that
says so.

The lit door opens **Das Haus der verliebten Zahlen** — ten questions,
the partners to ten, with the ten-frame and the four number generators
carried over from LernInseln unchanged. Coming out pays **Mathe-Sterne**
and **Münzen** and the level bar moves. Only that screen pays stars.

The letters, syllables, shapes and writing houses are still in
LernInseln on purpose: each drags its own word list, word pictures or
writing font, and nobody can look at a house with no door. Every one of
them implements the same `Game` interface in `src/games/types.ts` and
will drop in unchanged when a door exists for it.

Luma speaks. `node tools/genvoice.mjs` reads every `say.*` line out of
`src/core/i18n.ts` and writes MP3s into `assets/voice/`; the running app
has never heard of ElevenLabs, and the suite still checks that. A line
that is not in the string table cannot be spoken.

Measured, not estimated: opening the world takes 155 ms and walking
costs 0.81 ms of script per frame — on a desktop under software
rendering, so read it as a bound on the work rather than as a frame rate
on an iPad. `node tools/messen.mjs` takes it again.

## What to do next

**Play it.** PLAN.md item 1, and it is now the whole loop rather than
half of it: walk, find the door, answer ten things, come out stronger,
watch the bar move. The question the world was built early to answer —
*is walking around worth doing* — is still open, and it finally has
something to answer it with. If it fails, the design needs revisiting
and this is much cheaper than finding out after four dungeons.

**Settle the steering while he has it in his hands.** Both are built and
the switch is two taps away inside the world, in the settings behind the
cog. Ninety seconds, take whichever answer comes back, and then delete
the other one.

Then Luma, PLAN.md item 2 — she has a voice already and no face.

## Things worth knowing before you start

* `LEARNINGS.md` in `C:\Development\Lernkiste` is a list of mistakes
  that have already been paid for. Reading it is fifteen minutes and
  will save more.
* The Bash heredoc in this environment eats backslashes and breaks on
  apostrophes. Anything with a regex or an English possessive goes
  through a file write, not a heredoc.
* A failing `tsc --noEmit` means `dist/` was **not** rebuilt. That has
  now cost four measurements across two projects, so `npm run verify`
  refuses to start against a `dist/` older than `src/`. Believe the
  guard, not the green run.
* The ElevenLabs key is at `c:/development/fallennights2d/.env` and
  needs the `text_to_speech` permission, which it now has.

## The written record

`README.md` is the front door. `DEVLOG.md` is the diary — four entries
so far, the second of which explains why this project exists — and it is
**generated** from `devlog/*/article.md`, so edit those and rerun
`node tools/devlog.mjs`. `DEVLOG-STYLE.md` is the house style and is
worth reading before adding an entry: three strands always, keep the
wrong turns in, and numbers are measurements rather than estimates.

## Open questions for Patrick

Ask; do not assume.

1. **Touch steering — now answerable.** Both are built and switchable
   in-game, so this is no longer a question to ask but a thing to watch
   for ninety seconds. Whichever loses should then be deleted rather
   than kept "in case".
2. **How big is the first region?** Still open. 48×36 tiles, about nine
   iPad screens, is this repo's answer until Patrick gives a better one
   — and it is a guess, not a measurement. Walking the whole thing is
   the way to judge it.
3. **The door.** There is a lit doorway on the path and walking into it
   gets a chime and nothing else, because inventing a room behind it
   would be worse than leaving it shut. A child will try it in the first
   ten seconds. Is a warm chime enough of an answer for a week, or does
   it need to be visibly closed?
4. **Luma's artwork.** He wants to make her with Gemini. What size, and
   how many expressions — one, or happy/thinking/pleased?
5. **Does the son want to be the character, or someone else?** It
   changes how the editor should be framed.

## One thing noticed and left alone

The ochre tunic (`KLEID[3]`) sits almost exactly on the value of one of
the four skin tones, so that combination reads as a blob rather than as
a person. It has been there since the editor was built and it is
visible on the contact sheet's bottom row. Fixing it means darkening a
ramp that saved characters are already wearing, which is a decision
about existing slots rather than a tidy-up, so it was left for Patrick.
