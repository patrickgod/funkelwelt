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

## Next, in order

### 1. Play it, before building anything on it

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

**The game is now playable end to end** — walk, find the door, answer
ten things, come out stronger, watch the bar move — with no combat and
no fairy, and that is enough to be worth a real playtest.

### 2. Luma

* Portrait bottom-left, text box beside it, JRPG framing.
* Two sentences at a time, never more, and spoken via the ElevenLabs
  build-time pipeline lifted from LernInseln.
* She says each line **once** — `spielstand.gehoert` already tracks it.
* Artwork: Patrick wants to make her with Gemini. Until then a drawn
  placeholder in the game's own palette.

### 3. When a pair comes good

`bekanntePaare()` already knows when a pair to ten is solid in **both**
directions, which is the real definition of having learned one, and at
the moment it fires a small burst of hearts and nothing else.

That is the thing this whole app is actually for. It deserves more of a
fuss than finishing a round does — and it is a signal to the grown-up in
the room as much as to the child.

### 4. Shadows

* Visible on the map and **walked into on purpose**, not sprung from
  the grass. KONZEPT.md's worry about the interruption tax is real.
* Correct answers push it back; wrong answers do nothing at all.
* **Mut** fills; full Mut ends it at once.
* Coins on the way out.

### 5. Gates, and a second region

* A gate that wants `Mathe` level 3. The world visibly gets bigger.
* This is the moment the per-subject experience pays off, and the first
  time a child sees that being good at something opened something.

### 6. The shop

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
