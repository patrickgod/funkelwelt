# Learnings

Things this project paid for, written down as they were earned. The
list from the previous project is at `C:\Development\Lernkiste\LEARNINGS.md`
and is worth reading before repeating anything in it.

The format is deliberate: **the signature first**, then the cause. A bug
signature is reusable — the same wrong picture means the same wrong
thing next time — while a fix is only ever about one line.

---

## Three identical cream squares where the hairstyles should be

**Signature:** a row of swatches that are all the same colour, in a
chooser that is supposed to show a choice.

A hairstyle has no colour of its own. Rendering "hairstyle" as a colour
swatch renders nothing at all. They are little heads now, drawn in the
character's *current* hair colour, and they repaint when that colour
changes — so the swatch shows the actual thing being chosen.

Generalises: **a swatch has to be a small copy of the result, not a
symbol standing in for it.** Any time a chooser renders as a coloured
square, ask what it would look like as a picture of the outcome.

## A potato in a bowl cut

**Signature:** every character reads as the same character, and the
side view is the front view with an extra eye.

Three separate faults in one sprite, and the contact sheet showed all
three at once: a full-width fringe two pixels above the eyes (no
forehead), no gap between the legs (so the walk cycle did not read), and
a profile that was the front view rotated by nothing at all.

The fixes were a forehead, three pixels of daylight between the legs,
and a genuinely narrower head with a nose. Small distances, and each of
them was the difference between a person and a lump.

Generalises: **legibility at small sizes comes from gaps, not from
detail.** The three pixels between the legs did more than any amount of
shading.

## Touch targets under the floor, caught by the suite on its first run

**Signature:** nothing looks wrong.

The colour swatches in the character editor were 52×52. AGENTS.md rule
12 says 64×64 minimum, because Apple's 44pt is a figure for adult
fingers. The measurement check caught it the first time it ran, which is
the entire argument for writing that check before the screen it
measures.

## The icon that belonged to a different game

**Signature:** it looks fine. It is the previous project's icon.

The whole toolchain was copied from LernInseln, `tools/icons.mjs`
included, so Funkelwelt shipped its first deploy wearing LernInseln's
island. Two learning games with the same icon on the same home screen is
a bug, and the home screen is exactly where both of these will live.

Generalises: **when a project is forked from another, the things that
identify it are the things nobody thinks to change** — icon, title,
theme colour, cache name, localStorage key. Four of those five had been
changed here. The one that had not was the only one that is invisible
until the app is closed.

## An icon judged at 512 is not an icon

**Signature:** a beautiful icon that is a warm smudge on the device.

The first lantern had a bright core inside the glass *and* a flame. At
512 that read as a lit window; at 60 pixels the two merged into one blob
and the lantern stopped being a lantern. Removing the brightest colour
from everywhere except the flame fixed it.

Found by building `tools/iconsheet.mjs`, which renders the icon at 180,
120, 80 and 60, behind the squircle iOS masks it into, on home-screen
grey. Same lesson as the sheep that read as white pebbles on the last
project, in a new place: **judge a thing at the size and on the
background it will actually be seen.**

## Fractional nearest-neighbour scaling staggers every straight edge

**Signature:** a pixel icon whose vertical lines are subtly uneven —
some three pixels wide, some two.

iOS wants 152, 167 and 180. None divides 64. Nearest neighbour at 2.8125
gives some source pixels three output pixels and others two, and this
icon is nothing but straight edges. Scaling up to an exact 512 first and
then box-filtering down means every output pixel averages a whole block.

Generalises: **integer factors or an area average; never nearest
neighbour at a fractional factor.**

## A character walking around inside a barrel

**Signature:** a sprite that is correct standing still and wrong the
moment it moves.

The adventurer's profile had both legs at the same height, in the same
colour, three pixels apart — so at speed they merged into one brown
block as wide as the body. The lantern hung at hip height directly over
the back leg, and in a side view the back leg *is* the walk cycle.

Everything about this had been signed off from a contact sheet, and the
contact sheet was not wrong: a standing profile with two legs in the
same place is exactly right. It only fails in motion.

The fix was legs swinging forward and back rather than up and down, the
far one two steps darker so it reads as behind, and the lantern raised
to chest height and held out in front on a visible arm.

Generalises: **a grid of poses cannot review a walk cycle.** Judge
anything that moves where it will be seen, at the size it will be seen,
doing the thing it will be doing. Rule 3 already says "at the size and
on the background it will actually be seen"; this adds *and doing what
it will actually be doing*.

## One step down the ramp is not a lantern

**Signature:** an effect that is provably happening and reads as nothing.

The region is composited twice, a step apart, and the bright copy shown
through a disc around the adventurer. Sampling the finished frame gave
`84,133,68` beside him and `63,108,58` out in the dark — a real
difference, about twenty per cent, and completely invisible.

One step gives two states and no falloff, and the lit disc covered most
of the screen, so there was nothing on screen to compare against. Three
copies and two rings — dark, half, full — and it reads as a lantern.

Generalises: **the eye needs the falloff more than it needs the depth**,
and "I cannot see it" and "it is not happening" are different bugs.
Sampling the actual pixels of the actual frame told them apart in eight
lines and saved debugging a compositing path that was already correct.

## 430 milliseconds that were not where the theory said

**Signature:** the confident optimisation moves the number by a tenth.

Opening the world took 430 ms. The obvious culprit was compositing 1728
tiles twice over for the two frames of water ripple, so the second frame
became a copy of the first with only the water redrawn. That is a real
saving and it bought 49 ms.

The actual cost was `Px.remap`, which keyed its colour cache on the hex
string — building `#rrggbb` for 442,368 pixels, four times, on every
entry to the world. Keying on the packed integer and building the string
only on a cache miss: **155 ms**, same picture, pixel for pixel.

Generalises: rule 5 again, and the corollary that matters more than the
rule — **a fix that does not move the number is information.** It is
only information if there was a number before it.

## The class that nothing styled

**Signature:** a chooser where nothing looks chosen.

The settings panel toggled `.gewaehlt` on the selected button, and the
only rule for that class in the stylesheet was `.probe.gewaehlt`, for
the character editor's swatches. So every option rendered identically
and the panel silently offered no feedback at all.

Generalises: **a class name is not a contract.** When a behaviour is
"toggle a class", the check is that something on screen changed —
which here meant looking at a screenshot of the panel, where it was
obvious in a second and invisible in the code.

## A check that quietly changed what it was measuring

**Signature:** a check that has passed all week fails the moment a
feature lands next to it — and it is the check that is wrong.

*A wall is a wall — the house stops you at the doorstep* walked north
out of the doorway and asserted the adventurer had not got far. The
moment the door started opening it stopped measuring the wall and
started measuring the door. It failed noisily, aborting the run, because
the next line tapped a button on a screen that no longer existed.

That is the GOOD outcome and it is the argument for asserting on a saved
coordinate rather than on a screenshot: a visual check would have kept
passing while meaning nothing. The check now walks west into the side of
the house, and the comment above it says why it moved.

Generalises: **when a feature lands, re-read the checks that touch the
same square metre of the game.** One of them is probably now testing
something else.

## Three hard-coded numbers that were all the same mistake

**Signature:** a check that fails, and the code is right.

"Three of the four things are too dear at 21 coins" — I had done the
arithmetic in my head, written `=== 3`, and got 2. The shop was correct;
the assertion was a copy of my own mental sum.

It reads the prices off the screen now and counts the ones above the
purse, which is a statement about the RELATIONSHIP rather than about
this particular price list, and it survives the next price change.

That is the third variant of one mistake in this project — `=== 0` for
"unchanged", `>= 0` for "there is something there", `=== 3` for "the
ones above the purse". Every one of them replaced a relationship with a
constant that happened to be true when it was written.

Generalises: **if an assertion contains a number you worked out
yourself, the check is testing your arithmetic.** Derive it from the
same thing the code derives it from.

## A penalty check that ran where the penalty could not bite

**Signature:** the most important assertion in the project, passing
against code that breaks the rule it exists to protect.

"A wrong answer must never cost the child anything" is the single most
important decision in KONZEPT.md, so meeting a shadow got four
assertions: Mut does not move, the shadow does not advance, no coin is
taken, nothing turns red.

Then the sabotage run put `mut = Math.max(0, mut - 1)` on a miss — the
exact mistake an RPG framing would make — and the check **passed**. It
answered the wrong question first, on an empty bar, so there was nothing
there to take. `max(0, 0 - 1)` is `0`.

It answers one right first now, so Mut is at 20% when the miss lands,
and the check also asserts that the reading it compares is not zero.

Generalises: **a check that something is not taken away has to run from
a state where there is something to take.** The empty-inventory case
passes every theft test ever written. Same family as "zero is a lazy
spelling of unchanged" — and the reason it was caught is rule 4: the
sabotage run is not a formality, it is the only thing that tells you
whether an assertion is load-bearing or decorative.

## A check that asserted zero was asserting something about the suite

**Signature:** an assertion of an absolute — zero, empty, exactly one.

*And it pays coins rather than stars* asserted three coins and zero
stars after picking up a lightspark. Zero was true until a house round
ran earlier in the same suite, and then it failed correctly for the
wrong reason: the check had never been testing *sparks do not pay
stars*, it had been testing *nothing else in this file earned any*.

It measures a difference now — stars before, stars after, unchanged.

Generalises: **"zero" is almost always a lazy spelling of "unchanged by
this", and the two agree right up until they do not.**

## The stale bundle, twice more, one of them mixed

**Signature:** a suite result that looks real and is about code that is
not on disk.

AGENTS.md rule 1 has said since day one that a failing typecheck means
`dist/` was not rebuilt, and cited two occasions on the previous project.
It then happened twice in one afternoon here, both during sabotage runs.

The first was the textbook version: an unused constant failed the
typecheck, `dist/` kept the last build, and the suite reported that
everything was fine.

The second was worse. Same failed build, but `dist/` was holding the
PREVIOUS sabotage — so the suite reported a mixture of passes and
failures, all of it plausible and none of it about the code on disk. A
mixed result looks like a real result; an all-green one at least invites
suspicion.

`tools/verify.mjs` now refuses to start if anything under `src/` or
`public/` is newer than `dist/main.js`.

Generalises: **a written rule that has failed to stop something twice is
not a rule, it is a wish.** Turn it into an assertion. This project had
already done that for "you cannot lose", for "nothing leaves the device"
and for "every button is 64 pixels", and had left the one about its own
build process as prose.

## A celebration that could never fire

**Signature:** a screen that is correct in every line and has never once
been reached.

The pair-to-ten celebration asked "which pairs are new" by comparing
`bekanntePaare()` at the end of a round against `bekanntePaare()` — read
at the end of the same round. But `stand.merken` runs as each question
is answered, so the pair had been known for three minutes by the time
the payout asked, and the answer was always nothing.

Every line of it was right. It was found by trying to take a
SCREENSHOT of it, and failing six times.

Generalises: **a before-and-after comparison has to capture "before"
before the thing happens**, which sounds too obvious to write down and is
exactly why it survived review. And: rule 2 says verify by looking —
this is what happens when you cannot get the thing on screen to look at.
Not being able to reach a screen is itself the bug report.

## A check that timed out instead of failing

**Signature:** a suite that hangs for thirty seconds and then dies,
instead of printing FAIL.

`and she is a picture that actually loaded` measured
`.luma-gemalt`'s `naturalWidth`. When the portrait is missing the
element REPLACES ITSELF with the coded fallback — so the locator matched
nothing and Playwright waited thirty seconds and threw, aborting the
whole run before any of the checks after it.

Generalises: **a check on an element that might not exist must count it
before it measures it.** A check whose failure mode is a timeout is a
check nobody reads the output of, and it takes the rest of the suite
with it.

## A generated character and a character editor want different things

**Signature:** the art is good, the pipeline works, and switching it on
would delete a feature.

A generated 34px sprite sheet of the adventurer came out well — three
directions, three walk frames, one consistent child. Wiring it in would
have removed the character editor, and the reason is that the pixeliser
snaps to whichever palette colour is NEAREST, and it does not know which
part of the picture it is looking at. Sampled against the palette, hair,
tunic and boots had all landed on `timber`. Recolouring the tunic
recolours the hair.

Generalises: **generated art is a photograph of a decision, not the
decision.** Anything the game needs to VARY at runtime has to be varied
in a dimension the generator was told about — a separate ramp, a
separate layer, a separate generation — and if it was not, the variation
is gone and no amount of post-processing gets it back.

The measurement is what made this a decision instead of an argument: six
lines of Python sampling six regions of the sheet against the palette.

## Committing before deliberately breaking things

**Signature:** twenty minutes of work gone, and the tool that ate it was
the cleanup step.

Rule 4 says a new test must be seen to fail before it is trusted to
pass, so the collision test, the thumbstick, the pathfinder, the
position save, the settings write and the HUD were each broken on
purpose and the suite run against them. The way back was
`git checkout -- src/`, which put the sabotage back — along with six
files of uncommitted work.

Generalises: **sabotage runs need a commit in front of them.** The
practice creates a "put it back" step, and "put it back" and "throw away
everything I have not committed" are the same command.

**It then happened twice more in the same session**, and the second time
was the one that cost real time: the revert quietly took back a one-line
fix to the pair celebration, the screenshot that had just started
working stopped working, and the next half hour went into debugging a
bug that had already been fixed and un-fixed. The rule is not "commit
before the first sabotage". It is **commit before every one of them**,
including the third, including when the change since the last commit
feels too small to bother.

## Four icon promises turned into four assertions

Every failure mode of a home-screen icon is silent: a missing file (iOS
falls back to a screenshot of the page, which for this game is a black
rectangle), a `sizes` attribute that disagrees with the PNG (Safari
picks it and rescales, so the pixel art smudges), and transparency (iOS
composites onto black — the icon looks perfect in every preview and is a
black square on the device).

All four checks were watched failing first, per rule 4: a wrong `sizes`,
a deleted file, one transparent pixel, and a removed 180 link. Two
minutes, and the alternative is finding out on someone else's iPad.

## The suite must not be defeated by its own corpse

**Signature:** a sabotage run printed nothing at all — not a pass, not a
failure, no summary line. Twice.

The first time, the staleness guard caught it and said so plainly:

```
FAIL  dist/ is 474s older than src/ — the build did not run,
      so everything below would be measuring the previous one.
```

`npm run verify` does not build. Every sabotage in the loop had been
edited into `src/` and then measured against the *previous* bundle. The
guard existed precisely because that had already shipped a wrong
conclusion once, and this time it turned a silent false result into a
loud one. **A sabotage loop must have the build inside it**, not beside
it — `npm run build && npm run verify`, every iteration.

The second time was worse, because it was the suite eating itself. A run
hit the ten-minute wall and was killed; the static server it had started
outlived it and kept holding port 8395; the next run died on
`EADDRINUSE` with a raw Node stack trace where its output should have
been. The tool that says whether the game works was broken by its own
previous corpse.

Fixed by deleting the constant: `server.listen(0)` and read the port
back off `server.address()`. There was never a reason for the number to
be fixed — nothing else needs to find this server, it exists for ninety
seconds and dies.

Generalises twice over. **A fixed port in a tool that nothing else
connects to is a shared global for no benefit.** And more usefully:
**when you grep a run's output for specific checks, grep for the
summary line too.** Both of these looked, at a glance, like a clean run
that simply had nothing to say — and "no output" reads as "fine" to a
tired eye at exactly the moment it means "this measured nothing".
