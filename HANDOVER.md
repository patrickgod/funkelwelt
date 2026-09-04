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
node tools/genkunst.mjs --was luma --varianten   # four portraits to pick from
node tools/genkunst.mjs --was titel --varianten  # four opening pictures
node tools/pixbatch.mjs       # generate + pixelise the whole sprite set
node tools/blatt.mjs in.png out.png --spalten 3 --zeilen 1 --hoch 34
                              # cut a generated sprite SHEET into frames
node tools/contact.mjs luma   # the coded fallback, at the sizes it is seen
```

`tools/shot.mjs haus-paar` is order-dependent: it seeds a save so that a
pair is one right answer away, and it has to reseed after the reload
because the world's five-second autosave will otherwise write the old
save back over it.

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

Luma speaks, and now has a face. `node tools/genvoice.mjs` reads every
`say.*` line out of `src/core/i18n.ts` and writes MP3s into
`assets/voice/`; `node tools/genluma.mjs` writes her brief, asks Gemini
for four portraits and `--aus` picks one. Both run at BUILD time — the
running app has never heard of either service and the suite still checks
every request's origin. A line that is not in the string table cannot be
spoken.

**Her portrait is the one exception to "every pixel is drawn in code"**,
and AGENTS.md says why in full. Short version: she is a painting in a box
in FRONT of the world, which is where Final Fantasy, Persona and modern
Zelda put theirs. Anything that goes IN the world is still drawn in code.
The coded 46x46 fallback in `src/spiel/luma.ts` stays, and is also the
argument for the exception.

Everything AROUND her matters more than the picture: she says each line
once per adventurer and never again, the world holds still while she
talks, the whole box is the tap target, and she leaves on her own. After
three misses in a round she turns up and the ten-frame comes back for
the rest of it — concrete before abstract, re-offered, with nothing
taken away and nothing marked.

And when a pair to ten comes good in **both** directions, that outranks
the payout and is shown first. That is the thing the whole app is for.

**THERE ARE TWO WORLDS.** `karte.ts` builds ONE at a time —
`ladeRegion(r)` rebuilds every export in that file from a different set
of authored rows — so everything it exports describes whichever region
is currently loaded. The save remembers which (`stand.region`), and
`zeigeWelt` loads it before anything reads the map.

Every id a save remembers carries its region (`wiese:f27,16`). Both maps
are 48×36 and have things at the same tiles, so an unprefixed id is a
spark in one world being collected by walking in the other.

**Die Wiese is the MATHS world; Das Ufer is Deutsch.** A waypoint stone
in each goes to the other. Shadows ask what THEIR region teaches — see
`HAEUSER` in `src/ui/runde.ts`, and do not go back to reading GAMES,
which is how a shadow in the maths meadow came to ask a child to split
"Amelie" into syllables.

**The seven letters are the rule of the second world:** a A, e E, i I,
l L, m M, o O, u U, and nothing else. Every word a child meets there is
built only from letters they have been taught, which is the whole
method — adding a name that needs an eighth letter breaks it rather
than extending it. `src/games/silben.ts` checks itself and so does the
suite.

**Die Wiese is the MATHS world.** There will be a second one for
Deutsch — that is Patrick's shape, not an idea to revisit — and the
waypoints in PLAN.md exist to get between them.

Four houses, one topic each, and all four pay Mathe-Sterne:

* **Das Haus der verliebten Zahlen** — the pairs that make ten. West,
  the first door a child meets.
* **Das Haus der Nachbarzahlen** — a row with one gap in it. The middle
  building; it was Das Haus der ersten Laute until Deutsch moved out.
* **Das Haus der Addition** — plus, to ten. North of the first, so the
  beginner's door and the step up are neighbours.
* **Das Haus von links und rechts** — four vehicles seen from the side,
  one going the way the arrow points. East of the path.

**One generator per house, and keep it that way.** `Haus.spiel` takes a
list and the Burg will need it, but a door named after a topic that asks
a different one is a door that lied about what was inside.

**Nothing above ten**, anywhere: not in the question, not on the right
card, and not on a wrong one either, because a distractor of fourteen
teaches a child that fourteen is plausible. It is a check, not a
convention, because a ceiling is the kind of number somebody raises by
copying the line above it.

**Every generator in GAMES must have a door.** Four of them once shipped
for weeks with none — bundled into every download, unreachable. That is
a check too, and it is why closing the word house also took `anlaute`
and `silben` out of GAMES rather than leaving them lying there.

Each door has a small **plaque** beside it saying what is done inside —
counting dots, a row with a gap, a plus, two arrows — and no letters on
any of them. `haus.png` is one generated sprite used for every door, so
without them the only way to find the right house is to walk into the
wrong ones and remember which. Run `node tools/contact.mjs tafel` before
changing one: of the six drafts written so far, three were unreadable at
the size they are actually seen, and that sheet is the only reason
anybody found out.

The same goes for `node tools/contact.mjs fahrzeuge`. Three of those
five first drafts failed too.

**A gate wants the subject of the world it stands in**, and a house can
say `nurHaus` to keep the shadows out of it — the writing exercise has
no answer cards, and a shadow encounter has a creature, a courage bar
and some cards, with nowhere to put a writing surface.

**Luma asks before anything happens.** A house, the cart, a shadow and
the waypoint all confirm first, with a big yes and a big no — see
`fragen()` in `main.ts`. Tapping a thing to choose it fixed accidental
triggers; this fixes the other half, which is that ARRIVING committed
you to ten questions. Saying no costs nothing. Every check that enters
something has to answer her (`jaSagen()` in the suite).

**A wrong answer is a retry, not an ending.** In the houses the card
flashes red, the answer is NOT revealed, and the same question stays;
three wrong answers restart the house. Read the amended rule 11 in
AGENTS.md before touching any of it — it says exactly which half
changed and which half must not, and the half that must not is the one
an RPG framing keeps trying to undo.

Nothing changed in a shadow encounter. Mut only ever fills, a wrong
answer moves nothing at all, and leaving takes nothing.

**A shadow asks whatever the meadow teaches.** The prompt renderer
lives in `src/ui/frage.ts` and every screen that asks a question uses
it. It used to live inside the round screen, which is why the encounter
had its own hard-coded ten-frame and could only ask one thing — if you
add a prompt kind, put it there and both screens learn it at once.

There are five kinds of creature and they differ in silhouette before
colour. Read the top of `src/spiel/schatten.ts` before drawing a sixth,
and run `node tools/contact.mjs schatten` after: the rules that make
these not-monsters are not decoration, and a creature that reads as
dangerous breaks the one sentence the whole design rests on.

**Contact sheets are `shots/blatt-*.png`.** They used to share names
with `tools/shot.mjs` output, and a world shot silently overwrote a
sheet that had just been reviewed.

A **cart** stands beside the path out of the house with four things on
it. Read `src/ui/laden.ts` before changing it: every rule in there is a
reaction to the shop that failed the playtest which created this
project, and the important one is that a child cannot spend badly. Four
things, one screen, nothing placed, and every effect visible in the
world rather than as a number.

**A gate's marks are LEVELS, and they light one at a time.** Three
marks means level three, which is thirty-two stars — so the marks must
never be read, or drawn, as "three stars". They fill as the levels are
earned, which is the only thing making that picture honest, and it is
checked at the pixel in `tools/verify.mjs`.

**Two gates**, each into a pocket sealed on every other side. The one in
the north-east cliff wants Mathe 3; the one in the south-east cliff
wants Wörter 2. Each shows what it wants as stars rather than as a
number — rule 14 — and they light when it opens.

This is where the per-subject stars stop being a design note and become
a fact, so read the three checks in `tools/verify.mjs` before changing
anything here. The one that carries the weight is not that the gate
opens; it is that **two hundred Mathe-Sterne do not open the Wörter
gate**. Without it the two subjects are one currency with two labels,
and a child who is strong at numbers is quietly handed everything.

The gates are told apart by COLOUR, not by shape: gold for numbers, blue
for words, in the dim markings as well as the lit ones. Shape alone was
tried and failed a screenshot taken from where a child actually stands —
at gate size the difference between a four- and a five-pointed mark is
two pixels.

Seven **shadows** stand in the dim corners off the path. Not solid: you
see one from across the meadow and decide about it. Meeting one is the
screen the whole design is arranged around, so read
`src/ui/begegnung.ts` before touching it — Mut only ever fills, a wrong
answer moves nothing at all, and leaving takes nothing. Chased away it
leaves a light where it stood, for ever, so clearing all seven makes the
region measurably brighter.

Measured, not estimated: opening the world takes 155 ms and walking
costs 0.81 ms of script per frame — on a desktop under software
rendering, so read it as a bound on the work rather than as a frame rate
on an iPad. `node tools/messen.mjs` takes it again.

## The art, and where the line is

There are three kinds of picture in this game and the difference is a
SIZE, not a principle. AGENTS.md has the full argument; the short version:

* **Generated, then forced onto the palette.** Anything over about 24
  pixels: the house, the trees, the lamp post, the signpost, the rock.
  `node tools/pixbatch.mjs`. The pixeliser snaps every pixel to the
  closed palette, so `welt.ts` cannot tell these from the drawn ones —
  both are `Px` buffers and both get stepped down a ramp for the lantern.
* **Drawn in code.** Anything under it: the adventurer, every 16×16
  ground tile, Luma's companion bubble, the lightsparks, the ten-frame,
  the icons, the effects. A 16px bush came back from generation as a
  pink smear, which is where the line was measured.
* **Painted.** Luma's portrait and the opening picture. Not on the
  palette at all, because they are not in the world — they are in front
  of it.

Both generators need keys. ElevenLabs (voice) is at
`c:/development/fallennights2d/.env`; Gemini (pictures) at
`C:\Development\shortsmith\.env`. **The Gemini key ran out of
prepayment credit** — top up at <https://ai.studio/projects>.

## What to do next

**The adventurer.** PLAN.md item 1, and it is now a DECISION rather
than an experiment. The sheet exists and is good —
`assets/sprites/held.png`, 3×3 frames of 34×34, front/back/profile —
and it is not wired in because it collides with the character editor:
hair, tunic and boots all snapped onto the `timber` ramp, so no recolour
can keep four independent sliders. PLAN.md lists the three ways out.
The likely best one is presets instead of sliders.

**Play it.** PLAN.md item 2, and it is now the whole loop rather than
half of it: walk, find the door, answer ten things, come out stronger,
watch the bar move. The question the world was built early to answer —
*is walking around worth doing* — is still open, and it finally has
something to answer it with. If it fails, the design needs revisiting
and this is much cheaper than finding out after four dungeons.

**Settle the steering while he has it in his hands.** Both are built and
the switch is two taps away inside the world, in the settings behind the
cog. Ninety seconds, take whichever answer comes back, and then delete
the other one.

Everything else in PLAN.md is addition rather than risk: more of
LernInseln's houses (each one a door, a generator and a prompt kind,
all of them already written), and eventually a second region. None of
it should start before somebody has played this one.

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
`node tools/devlog.mjs`. There are five entries. `DEVLOG-STYLE.md` is the house style and is
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
