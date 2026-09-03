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

* **Das Haus der Rechenmeister, and a plaque on every door.** The third
  door. It takes Nachbarzahlen and addition — the step up from the
  pairs that make ten — and stands next to that house on purpose, so
  the beginner's door and the harder one are neighbours.

  Four generators had been shipping with no door at all: they sat in
  GAMES, bundled into every download, unreachable, contradicting the
  comment at the top of their own file. Two now have doors, two were
  out of scope and are gone. The check that stops it coming back is
  structural — every generator in GAMES must be named by some house.

  The plaques are the readability half. `haus.png` is one sprite used
  for every door, so telling the houses apart meant walking into the
  wrong ones and remembering which. Each door has a small coded plaque
  saying what is done inside: counting dots, sound coming out, a plus.
  No letters on any of them. The contact sheet earned its keep the hour
  it was written — two of the four first drafts were unreadable at the
  size they are actually seen, and one of them was a brown smudge.

* **The scope, set by Patrick, and enforced.** Maths is verliebte
  Zahlen, Nachbarzahlen and addition, all at ten or below; German is
  the syllables. Das Haus der Formen was built and removed inside an
  hour. Nachbarzahlen came down from twenty, the subtraction came out
  of the addition house, and the doubles went with their answers of
  twelve to twenty.

  "Nothing above ten" is a check rather than an intention: every number
  on the question stage and on every card, including the wrong ones,
  because a distractor of fourteen teaches that fourteen is plausible.

* **Steering that answers a finger.** Patrick's two notes from playing
  it, and they were the same failure twice: you touch the screen and
  nothing happens. A tap was taken literally, so tapping the house —
  the most obvious thing in the picture — routed to a solid tile and
  did nothing at all. And a tap only existed on RELEASE, under 900ms,
  having moved less than sixteen pixels, so holding a finger down did
  nothing either.

  A tap on something solid is read rather than obeyed: a house means its
  door, anything else means the nearest place he could stand. And a held
  finger asks for a route four times a second, re-routed rather than
  steered straight at, so holding towards the far bank walks round by
  the bridge instead of into the water.

  Both are checked. Getting those two checks honest took three goes —
  the first aimed its tap into the HUD, the second was measuring the
  house when it claimed to be measuring the meadow, and the third was
  reading a saved position from before the walk.

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

### 2. It has been played once. Play it again, with the six-year-old.

**Patrick played it**, and the first thing that came back was not about
maths at all — it was that the steering did not work. Tapping the house
did nothing, and holding a finger down did nothing. Both are fixed and
both are checked now.

That is the lesson of the whole exercise and it is worth keeping in
front of whoever reads this next: **four houses' worth of didactics had
been built on top of a control scheme nobody had held a finger on.**
The suite drove the world with arrow keys, the screenshots drove it with
arrow keys, and tap-to-walk — the DEFAULT steering, the one a child
actually gets — had never been used by anything but a single check that
tapped once and let go.

Still open, and still the questions the world was built early to answer:

* Two minutes with the son, on the iPad.
* **Settle the steering** now that both halves of it work. Thumbstick or
  tap-and-hold; take whichever answer comes back and delete the other.
* Is the region the right size? "Small enough to learn by heart" is the
  goal and 48×36 is a guess at it.
* Does he find a door on his own? The plaques are new and untested by
  anybody who cannot read.
* Is ten questions the right length with a walk either side of it?
* Does he want to go straight back in, or straight back out? That one
  feeds directly into item 3.
* **Does Luma get in the way?** Three misses is a number nobody has
  tested.

### 3. The thing the design has not answered: coming back

Patrick, after the first play: *"Wir müssen im Konzept halt einen Weg
finden wie man immer wieder dieselben Themen übt und z.B. die
verliebten Zahlen nicht enden sobald das Haus einmal geschafft ist."*

This is the real hole and it is a design hole, not a missing feature.
The whole app is spaced repetition — `staerke` per fact, weighted
picking, the scheduler that already knows 7 is shaky and 5 is not — and
the world sits on top of it saying "done" the moment a house is cleared
once. The engine underneath is built for coming back a hundred times.
The building above it is built for going in once.

`geschafft[haus]` already counts the clears, so the count exists and
nothing reads it. Sketches, cheapest first, and **none of them should
be built before Patrick picks one**:

* **The house is never finished.** Its door simply keeps working, and
  what changes is what it asks: the scheduler already serves the facts
  a child is shakiest on, so the tenth visit is a different ten
  questions from the first. Costs nothing — it is close to what the code
  already does — and the missing piece is a REASON to go back in.
* **The reason is the star, and stars are per house.** A house that has
  been cleared once still pays, so the gates stay reachable by going
  back to a house you like. Small change, and it makes the gate a goal
  rather than a wall.
* **Die Burg der Mathematik** — Patrick's own suggestion. A fortress
  door that asks all of it, mixed at random, drawing from every
  generator the child has met. The natural "come back when you are
  stronger" building, and the natural home for `buildRound`'s list of
  generators, which already takes as many as you give it.

### 4. Links und rechts: what drives which way

Also Patrick's, and it is the next exercise to build: side-on sprites of
things that move — Auto, Bus, Fahrrad, Heli, Flugzeug — and the child
taps the ones going right, or the ones going left.

Worth noting why this is maths and not decoration: left and right is
Raumorientierung, it is in the same first-grade strand as the numbers,
and it is the one exercise so far that needs no counting at all. A child
who is slow with sums can be quick at this.

It is also the first exercise that needs a SET of drawn objects rather
than one, which means `tools/contact.mjs` first and the generator
second. Five vehicles, each facing both ways, is ten sprites, and the
lesson from the door plaques applies at full force: draw the sheet
before drawing the second one.

### 5. Waypoints

Patrick's: teleporting between places. Not needed while there is one
region — it becomes the answer to "the walk back is boring" the moment
there are two, and that is when to build it.

### 6. The rest of Deutsch: Silben lesen and Silben schreiben

The two that Patrick named and that do not exist yet.

**Silben lesen** is the cheaper one: the word split at the join, shown,
and the child picks the one they hear — or hears the syllables and picks
the word. It needs no new surface, only a generator and a prompt kind,
and the word list with its syllable counts is already here.

**Silben schreiben** needs the tracing surface from Lernkiste
(`src/games/schrift.ts`, 313 lines) and the writing font that goes with
it. It is the only prompt in the design with no answer cards at all —
the answer IS the tracing, and the round moves on when the last stroke
lands. `types.ts` still carries the `schreiben` prompt kind, waiting.

**Also open, and Patrick's to say:** Das Haus der ersten Laute asks
which letter a word starts with. It is not on the list of three, and it
was not asked to be removed either — it is still standing, and it is
the one place a Wort-Stern comes from, so removing it would leave the
Wörter gate unopenable until Silben lesen exists.

### 7. A second region

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
