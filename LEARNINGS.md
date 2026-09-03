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
