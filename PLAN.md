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

* **Shadows.** Seven of them, in the dim corners off the path, not solid
  — you see one from across the meadow and decide about it. Mut fills
  and never empties; a wrong answer moves nothing at all; leaving takes
  nothing. Chased away, never killed: it shrinks, its eyes dim, and it
  leaves a **light** where it stood, permanently. Clear all seven and
  the region is measurably brighter, which is KONZEPT's non-numeric
  progress bar at world scale.

  "A wrong answer costs nothing" is four assertions now rather than a
  paragraph — and the sabotage run earned its keep: the first version of
  them passed against code that drained Mut on a miss.

* **A gate that wants three stars.** A pocket carved into the north-east
  cliff, sealed on every side, with the gate as the only way in — two
  lightsparks and a lamp inside so the lesson does not land as a locked
  door with nothing behind it. What it wants is drawn as three stars
  rather than written as a level, and they light up when it opens.

  This is the moment the per-subject stars pay off, so both directions
  are asserted: it must not open early and must not stay shut late.

* **The cart.** Four things beside the path out of the house — a better
  lantern, fast boots, a Mut band, a hat. One screen, no scrolling, no
  categories, nothing to place. Every one is better than nothing and
  none is better than another, so there is no wrong purchase; and every
  effect is visible in the world rather than being a number.

  The direct answer to the playtest that started this project, and the
  things it must not be are what the suite asserts: not a catalogue, not
  a canvas, not somewhere a child can spend badly.

* **The language house, and the hat.** Das Haus der ersten Laute — the
  second door, and the first thing in this game that can award a
  Wort-Stern. Until it existed "Wörter 1" sat on the title screen for
  ever and the per-subject design had exactly one subject. The word list,
  the word pictures and the Anlaute/Silben generators came across from
  LernInseln verbatim; forty-four words recorded.

  And the hat from the cart is now actually on his head. It was drawn on
  nothing at all, which made the shop's one promise — every effect is
  visible — false for the single item whose entire point is being seen.

* **The second gate, and two kinds of star.** A pocket in the south-east
  cliff whose gate wants **Wörter 2**, which is what makes the stars
  per-subject rather than one currency with two labels. A child who loves
  letters and finds numbers hard opens a different door from one who is
  the other way round, and neither of them is behind.

  The assertion the design rests on is not that the gate opens — it is
  that the *other* subject does not open it. Two hundred Mathe-Sterne,
  and the Wörter gate stays shut. Sabotaged both ways: pointing the gate
  at the wrong subject breaks exactly the two subject-discriminating
  checks and leaves the 0/0 one green, which is the shape a real bug
  would have.

  Two readability fixes came out of looking at it rather than testing
  it. The round screen's star now comes from `sternIcon(fach)` — gold
  and five-pointed for numbers, blue and four-pointed for words — and
  the gates' SHUT markings are drawn in their subject's own dim colour.
  Shape alone had failed: at gate size the difference between a four-
  and a five-pointed mark is two pixels, so from where a child actually
  stands the two gates were the same door twice.

* **Das Haus der Formen, and a plaque on every door.** The third door.
  Shapes and patterns came across from Lernkiste with their generators
  and their flat drawings; a house may now name several games, so a
  round alternates find-the-shape and continue-the-row rather than
  being ten of either.

  It pays **Mathe-Sterne**, which is the design decision and not a
  filing one: shapes and patterns are the same strand of the curriculum
  as counting, so a child who finds adding hard and sees shapes
  instantly has a second way to earn the star that opens the Zahlen
  gate. A third currency would have said their strength was a lesser
  subject.

  Two things were changed on the way over rather than copied. The shape
  question was spoken and nothing else, which stops being a question the
  moment a parent uses the sound switch — it is a grey silhouette now,
  which is also a better exercise, because matching a silhouette to a
  coloured shape is recognising the form apart from its colour. And the
  star shape was `glow`, the exact colour of a Mathe-Stern, sitting
  among the answer cards of a game whose reward is a gold star; it is
  purple.

  The plaques are the readability half. `haus.png` is one sprite used
  for all three doors, so finding the shapes house meant walking into
  two wrong ones and remembering which — a child memorising a map
  instead of reading one. Each door now has a small coded plaque saying
  what is done inside: a ten-frame, an ear, a circle and a triangle. No
  letters on any of them.

## Next, in order

### 1. The adventurer: a decision for Patrick

The sheet is built and it is good. `assets/sprites/held.png` is a 3×3 of
34×34 frames — front, back and profile, three walk frames each, one
consistent child with a green tunic and a big gold lantern. It is not
wired in, and the reason is a measurement rather than a doubt.

**What was learned.** A generated character DOES survive downsampling,
at 34 pixels and not at 26 — and only with a brief that makes the
lantern a quarter of his height, because at 26 the face is mush and the
lantern is gone entirely. Patrick was right that sprite sheets are how
Zelda and the early Final Fantasies did characters; the thing that
needed testing was whether a downsampled generation survives, and it
does, one size up.

**Why it is not switched on.** It collides with the character editor,
and the collision was measured rather than guessed. Sampling the sheet
against the palette:

```
hair      skin[0], timber[2], timber[1]
tunic     timber[2], pine[4], leaf[3]
boots     timber[0], timber[2], skin[0]
face      skin[3], pine[4]
```

Hair, tunic and boots all land on `timber`. So the obvious trick —
swap one ramp for another to recolour the character — would repaint all
three together, and choosing blue hair would give blue boots. There is
no recolour that preserves four independent sliders on this sheet.

**Three ways out, and Patrick picks:**

1. **Presets instead of sliders.** Generate four or five complete
   adventurers and let the child choose one. For a six-year-old "which
   one is you" is an easier decision than four sliders, and KONZEPT's
   actual promise — *a child who picks slot two sees THEIR adventurer* —
   survives intact. Cheapest, and probably the best game.
2. **Generate for separability.** One more pass that puts every
   customisable part on its own ramp — hair on `fur`, tunic on `leaf`,
   skin on `skin`, trousers on `chalk`, boots on `earth` — and then the
   ramp swap gives the whole editor back. Needs the model to hold five
   colour families apart, which is the part that failed this time.
3. **Keep him drawn.** The editor is worth more than the sprite.

**Also blocked on credit** either way:
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

### 3. More of Lernkiste's houses

Still over there and all of them code: the first words, the rhymes, and
the two writing houses (which also need the tracing surface). Each is a
door, a generator and a prompt kind, and a house may now name more than
one of them.

The shapes and the patterns have crossed. What that cost, for
estimating the rest: a morning, of which the generators were twenty
minutes and the two things that had to be REDESIGNED rather than copied
were most of the remainder. Assume the same for each of the others —
none of them arrives unchanged, because Lernkiste answered to a menu
and this one answers to a world.

### 4. A second region

The gate proves the mechanism on twelve tiles. What it opens onto should
eventually be somewhere, not a walled garden — and the honest note is
that the pocket is small and deliberately so: the mechanism was the
point, and a whole second 48×36 region is a day's work that should wait
until somebody has played the first one.

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
