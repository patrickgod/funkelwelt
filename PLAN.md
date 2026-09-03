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

## Next, in order

### 1. The walkable world — the biggest risk in the project

KONZEPT.md says it plainly: *if the walking is not fun on its own, it is
a corridor between quizzes and worse than a menu.* So this gets built
and played before anything is built on top of it.

* A tile world: grass, path, water, trees, cliffs. Same closed palette.
* Top-down, the same three-quarter view the character is drawn for.
* **Touch steering.** Almost certainly a virtual stick that appears
  where the thumb lands, on the left half of the screen — a fixed stick
  in a corner is a thing a child has to find first. Tapping to walk to a
  spot is the alternative and is worth trying; decide by playing both.
* Camera follows, snapped to whole pixels, never a fractional offset.
* **Authored, not procedural.** A world a child can learn by heart is
  worth more than one that is different every time. Hyrule is the same
  Hyrule for everybody.

**How to know it works:** a grown-up walks around for two minutes with
nothing else in the game and does not get bored. If that fails, the
whole design needs revisiting and it is much cheaper to find out now.

### 2. One house, and the questions from LernInseln

* Copy `src/games/*` from `C:\Development\Lernkiste` — generators, word
  list, word pictures, ten-frame, scheduler.
* One door in the world: **Das Haus der verliebten Zahlen**.
* Inside: the existing round machinery, ten questions, but scored as
  **Mathe-Sterne** rather than the old currency.
* Coming out: coins, and the level bar moves.

At this point the game is playable end to end and worth a playtest, even
with no combat and no fairy.

### 3. Luma

* Portrait bottom-left, text box beside it, JRPG framing.
* Two sentences at a time, never more, and spoken via the ElevenLabs
  build-time pipeline lifted from LernInseln.
* She says each line **once** — `spielstand.gehoert` already tracks it.
* Artwork: Patrick wants to make her with Gemini. Until then a drawn
  placeholder in the game's own palette.

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
