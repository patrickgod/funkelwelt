# Plan

What to build, in order, and why that order.

The ordering rule throughout: **build the risky thing first, and look at
it.** A risk you have not built is a risk you are still carrying.

---

## Done

* `KONZEPT.md` — the design and its reasoning.
* The adventurer: four directions, three walk frames, six looks, a
  lantern. Two passes; the first was a potato in a bowl cut.
* Three save slots, Zelda-style, with a character editor.
* Verification suite, deploy to GitHub Pages, contact sheets.
* **The walkable world.** An authored region of 48×36 tiles, written as
  thirty-six lines of text so a person can edit it. Meadow, path, a
  stream with a bridge, a pond, two woods, cliffs. The camera follows on
  whole pixels. The lantern lights a stepped disc around the adventurer
  and the lamp posts light the path, so the region is drawn three times
  at three brightnesses and shown through a dithered mask — the fiction
  doing a job in the level design rather than in a cutscene. Ten
  lightsparks off the path, picked up by walking into them, paying coins
  and never stars. **Both** steerings, with the switch two taps away
  inside the world, because HANDOVER.md's first open question is which
  one a six-year-old prefers and nobody knows.

  Opening the world measures 155 ms and walking costs 0.81 ms of script
  per frame — on a desktop under software rendering, which bounds the
  work rather than predicting the device.

  **The bar it has not cleared yet:** a grown-up walks around for two
  minutes with nothing else in the game and does not get bored. Nobody
  has run that test, and the person whose opinion decides it is six.

* **The first house, and the teaching from LernInseln.** The ten-frame
  and the question types copied verbatim; the four number generators —
  verliebte Zahlen, Nachbarzahlen, Rechenmeister, Zwillinge — came
  across with their didactics and their spaced-repetition weighting
  intact. Walking into the lit door opens a round of ten. Coming out:
  **Mathe-Sterne**, **Münzen**, and the level bar moves.

  The letters, syllables, shapes and writing houses are deliberately
  still over there. Each drags its own word list, word pictures or
  writing font — about forty kilobytes for doors that do not exist — and
  nobody can look at a house with no door. They cross when their doors
  do; every one of them implements the same `Game` interface and will
  drop in unchanged.

  Luma speaks: `tools/genvoice.mjs` lifted and cut to the fifteen lines
  in `i18n.ts`, generated at build time, 400 KB, and the running app has
  never heard of ElevenLabs.

* **Luma, and the moment a pair comes good.** A painted portrait in a
  JRPG dialogue box — the one deliberate exception to "every pixel is
  drawn in code", because she is a painting in front of the world rather
  than part of it. She says each line once per adventurer, the world
  holds still while she talks, and after three misses in a round she
  turns up and the ten-frame comes back for the rest of it.

  And when a pair to ten comes good in BOTH directions, that outranks
  the payout and is shown first. It had never once fired: `paareVorher`
  was read at the END of the round, by which time the facts had already
  been recorded. Found by failing to screenshot it.

* **Juice.** Dust off the feet while walking, a lantern that breathes,
  weight at the door, coins that fly into the purse, and three children
  walking on the spot on the title screen. All of it a RESPONSE to
  something the child did; none of it fires on a mistake.

* **Generated sprites, forced onto the palette.** `tools/pixelise.mjs`
  and `tools/pixbatch.mjs`, lifted from Tidegarden: the model draws it,
  the pixeliser finds the grid it implied, averages down and snaps every
  pixel to the closed palette, with `--ramps` naming which drawers it
  may land in. House, three trees, lamp post, signpost, rock.

  The line is a SIZE and it is measured: 100px house ✓, 34px tree ✓,
  24px signpost ✓, **16px bush = pink smear**. Below about 24 pixels the
  drawn version still wins, which is where Tidegarden landed from the
  other side.

* **A door to come in through.** One painted picture, the title, and one
  button. Then the slots, with a line saying what they are for.

* **Onboarding.** The world wakes up — the lantern opens out of the dark.
  Luma flies at the child's shoulder from the first second. Tap-to-walk
  is the default (rule 13), and the game teaches it by putting a glowing
  ring on the path and asking, once, in whichever control the slot is
  set to.

## Next, in order

### 1. The adventurer is now the crudest thing on screen

He is 18×26 and drawn, and everything around him has just got much
better — which is exactly what happened to Tidegarden's terrace walls
when the ground was finished.

Two ways, and the answer is a measurement rather than an opinion:

* **A generated sprite sheet at his current size.** Patrick is right
  that Zelda and the early Final Fantasies did characters as sheets —
  but those were hand-pixelled, and the open question here is whether a
  DOWNSAMPLED generation survives at 26 pixels. The 24px signpost did;
  the 16px bush did not.
* **Make him bigger** — 34 or 44 — where generation certainly survives.
  That is a real art-direction decision: it moves the look from Link's
  Awakening towards Secret of Mana.

Generate one pose, pixelise it at 26 / 34 / 44, put them side by side
and pick. Then build the sheet cutter — raw sheet, slice the grid, run
each cell through the pixeliser at a fixed cell size so the frames do
not jitter, reassemble.

**Blocked:** the Gemini key ran out of prepayment credit mid-session.
<https://ai.studio/projects>

### 2. Play it, before building anything on it

The whole reason the world came first was to find out whether walking
around is worth doing. That question is still open — it just has
something to answer it with now.

* Two minutes with the son, on the iPad, with nothing else in the game.
* **Settle the steering.** Thumbstick or tap-to-walk. Let him try both
  in ninety seconds and take the answer, whichever it is; then the
  loser can be deleted.
* Is the region the right size? "Small enough to learn by heart" is the
  goal and 48×36 is a guess at it.
* Does he find the door on his own, or does he need the signpost
  explained? The path leads to it and the lamps light the way, which is
  the whole bet about level design instead of instructions.
* Is ten questions the right length now that there is a walk either side
  of it? Over on LernInseln ten was right for a round you arrived at
  from a menu.
* Does he want to go straight back in, or straight back out?
* **Does Luma get in the way?** Three misses is a number nobody has
  tested. It might be two, or it might be that a child who has got three
  wrong wants the fairy to leave them alone.
* Does she need more than one expression? She says the difficult line
  and the delighted line with the same face.

**The game is now playable end to end** — walk, find the door, answer
ten things, come out stronger, watch the bar move — with no combat and
no fairy, and that is enough to be worth a real playtest.

### 3. Shadows

The sprite is drawn already — `src/spiel/schatten.ts`, soft dark shape,
two worried eyes, no teeth — and nothing calls it yet. It shrinks rather
than being wounded as it is pushed back, because it is chased away and
never killed.

* Visible on the map and **walked into on purpose**, not sprung from
  the grass. KONZEPT.md's worry about the interruption tax is real.
* Correct answers push it back; wrong answers do nothing at all.
* **Mut** fills; full Mut ends it at once.
* Coins on the way out.

### 4. Gates, and a second region

* A gate that wants `Mathe` level 3. The world visibly gets bigger.
* This is the moment the per-subject experience pays off, and the first
  time a child sees that being good at something opened something.

### 5. The shop

* Three or four things at a time. Cloak, boots, lantern, Mut capacity.
* Everything available to every character.
* **Not a canvas.** The lesson from the playtest that started this
  project.

## Later, once the loop is proven

* **Number-objects in the world** — the Hack'n'Slash strand from
  KONZEPT.md. A bridge with seven planks that wants three more; a gate
  showing `6 + ?`; a lantern that wants `Ma` and then `ma`. These are
  authored, and there will be a dozen rather than a generator's worth,
  so they are the reward for having a world worth walking in — not the
  foundation.
* The language house, the writing house, the shapes house — all four
  already exist in LernInseln and port as dungeons.
* Day and night, lifted whole: the palette step is already in
  `palette.ts`.
* A second and third region.

## Deliberately not doing

* **Procedural world generation.** See above.
* **Random encounters that interrupt.** See above.
* **Any timer, anywhere.** Timers create anxiety in exactly the children
  who need the practice most.
* **Streaks, daily bonuses, or anything that punishes the day a child
  was ill.**
* **A leaderboard, or any comparison between children.** Ever.
