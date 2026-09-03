# How to write the Tidegarden devlogs

The publication is **"How to make games with AI"**. That decides
everything below. A reader arrives wanting two things at once — a story
worth reading, and a method they can use tomorrow morning — and an entry
that gives only one of them has failed.

So every devlog carries three strands, together, always:

## 1. The story, in the order it happened

Not a changelog. Not a feature list. A **diary**: what we tried, what
broke, what changed our minds. Written chronologically, because the
point is watching the thing evolve.

**Keep the wrong turns in.** The map that was built and then deleted is
more useful to a reader than any feature that worked first time. So is
the pivot away from 3D, the four performance theories that were wrong,
and the sheep that read as white pebbles. A devlog where everything
worked is a brochure, and nobody learns anything from a brochure.

## 2. Why — the game design behind it

Every change needs its *reason*, and the reason is almost always about
feel rather than code:

* why the game starts you with nothing (a shopping trip is not a
  decision);
* why winter stops the fields (a store of grain should be a decision,
  not a total);
* why the chimneys smoke only in the evening (a village that smokes all
  day is wallpaper);
* why it is not an idle game (idle loops run on compulsion, and this one
  runs on calm).

If a section cannot say what the change was *for*, it is a changelog
entry and belongs in the commit message instead.

## 3. How to do it yourself

The instructional strand, and the reason anyone is reading. In the
article these are the green **Method** boxes; here they are their own
paragraphs. Each one is a technique that transferred — something that
made the difference between an agent producing code and an agent
producing a game.

Good ones so far:

* Give the agent a rules file early, with **reasons** attached — rules
  without reasons get followed literally and wrongly.
* Make it measure before it fixes, and treat "the fix didn't move the
  number" as information rather than as a small win.
* Write down bug **signatures**, not bug fixes.
* Turn design promises into assertions ("you cannot lose" became a test).
* Check that a new test can actually fail before trusting that it passes.
* Review the artefact, not the diff — and crop tight for small art.
* Ask it where it is weakest and what it would not trust.

Include a real prompt whenever one carried the weight. Concrete beats
abstract every time.

## House rules

* **Numbers are measurements, never estimates.** If it says 22
  microseconds, something measured 22 microseconds. Every figure in
  these entries can be traced to a benchmark or a test in the repo.
* **Name the wrong turn before the fix.** The interesting part is the
  turn, not the destination.
* **End on what is still soft**, not on a high note. The current entry
  ends on scarcity, which is genuinely unsolved.
* **Show the game.** Capture the canvas backing store, not window
  screenshots: 640×380 of real pixels at a fifth of the size, displayed
  with `image-rendering: pixelated`, is sharper than a 2MB upscale.
* **Quote Patrick verbatim** where his words drove a change. "I really
  love the emotions, the feeling that music together with the art
  provides" is the whole design document, and paraphrasing it would lose
  it.

## Practicalities

* The illustrated version lives at a stable artifact URL and is
  **republished in place** — links already shared keep working. Do not
  create a second artifact.
* `DEVLOG.md` in the repo holds the same content as plain text, so it
  survives independently of any hosting.
* One diary, growing, rather than a pile of numbered posts. Chapters get
  appended; the story stays continuous.
