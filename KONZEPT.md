# Funkelwelt

*A small role-playing game for a six-year-old, in which the fighting is
arithmetic and nothing is ever lost.*

This document exists because Patrick asked the right question — *"soll
es wirklich das bauen sein?"* — and the honest answer needed more than
a yes. It is the design, the reasoning, and the places where I think
the obvious version would be wrong.

---

## What the playtest actually said

One session with one child. Two findings:

* **Collecting worked.** Stars, sweets, coins — a number that goes up.
* **Building did not.**

It is worth being precise about *why* building failed, because the
wrong diagnosis leads straight back to the same problem in a new
costume.

Building failed because it is **a second job**. A child who has just
answered ten questions is handed a shop, a currency, a catalogue of
twenty-seven things, an empty meadow, and no goal — and asked to make
an aesthetic decision. That is a blank page. Blank pages are hard for
adults and much harder for children. The loop was also four steps long
(earn → open shop → choose → place) and only the first step had
anything to do with what they had just been doing.

Collecting worked because it is **immediate, visible and automatic**.
It happens *to* you as a consequence of the thing you just did.

> **The lesson, stated generally: a reward that arrives on its own beats
> a reward you have to go and spend. If there is spending, it must be a
> short list of obviously-better choices, not a canvas.**

## Why an RPG is the right answer and not just a nicer wrapper

Patrick's instinct is right, and the reason is structural rather than
decorative.

**A role-playing game's core loop is already the learning loop.**

```
        RPG                        learning app
  meet something          →   a set of questions
  fight it with what      →   answer with what you know
    you know
  get stronger            →   the facts get easier
  reach harder places     →   harder material unlocks
```

That is not a theme painted over a quiz. It is the same shape. Which is
exactly why it will feel unlike the endless runner bolted onto a maths
test — the game part and the learning part are the *same activity*, and
a child can tell the difference immediately even if they could never
say what it is.

And it fixes the observed problem directly:

* **You do not design anything.** Getting stronger happens to you. No
  blank page.
* **What you buy is on your character**, on screen every second, not on
  a map you have to go and visit.
* **A purchase changes what you can do next** — a gate opens — so it is
  never only decoration.

## The world

A place that has gone **quiet and dim**. Not dangerous, not
threatening: dim. The lights have gone out of it and the words have
gone quiet, and the things that live in the dark have got braver than
they should be.

A child arrives with a lantern and learns the world bright again. Every
fact they learn is literally a light coming back on.

This fiction is doing real work, and it is chosen rather than
decorative:

* It explains why the monsters are **shadows that are chased away**,
  never killed.
* It explains the fairy — she carries the map of what is still dark.
* It gives a **visible, non-numeric progress bar**: the world lights up.
  That is DESIGN.md's rule from the other project — *progress visible
  without being numeric* — at world scale.
* And it is the truthful metaphor. Learning to read really does feel
  like a light coming on.

**Luma**, the fairy, appears at the bottom of the screen with a portrait
and a text box, JRPG-style, and says everything out loud. She is the
only character who explains anything.

## The character

Three save slots, chosen from a title screen. Each holds a name and a
character. Zelda's, because it is the right shape: a child who picks
slot 2 and sees *their* adventurer is looking at something that belongs
to them before they have done anything at all.

A small editor: body, hair, colours. Two starting sprites, and **every
outfit is available to every character.** Not for a political reason —
for a practical one: a great many six-year-old girls want the armour,
and a shop with a half marked "not for you" throws away half of its own
appeal. Offer the lot to everyone and let them choose.

## Getting stronger, and the thing that must not happen

Experience is **per subject**, which is Patrick's idea and a good one:

* **Mathe-Sterne** grow in the maths dungeons.
* **Wort-Sterne** grow in the language ones.

Being strong in maths opens maths places. This is honest — it is what
is actually true about the child — and it means a child who loves
numbers and finds letters hard is *visibly good at something* rather
than behind.

### Damage goes one way

Here is where the obvious design is wrong, and it is the single most
important decision in this document.

**A wrong answer must never cost the child anything.**

An RPG says: get it wrong, take damage, and eventually lose. Applied to
a maths question that reads as *not knowing this hurts you*, which is
precisely the lesson that makes a child decide at seven that they are
bad at maths. It is the same reasoning that gave the other project its
rule 9, and it does not stop being true because there is now a sword on
the screen.

So:

* **Correct answers push the shadow back. Wrong answers do nothing at
  all** — the right answer is shown, as a picture, and the next
  question comes. The shadow never advances.
* There is no health bar on the child. What there is instead is
  **Mut** — courage — a bar that **only ever fills**. It fills as you
  answer, and when it is full you do something big: the lantern flares
  and the shadow goes at once.
* A child who is struggling does not lose. The encounter simply takes
  longer, and after a few, **Luma turns up and helps** — which is a
  signal to the grown-up in the room as much as to the child.

This keeps every good feeling an RPG has — stakes, a bar filling, a
finishing move — and throws away the only part of it that would harm
somebody.

### Being "defeated"

Patrick's instinct was already right: *"wir müssen uns nur kurz
ausruhen"*. There is no defeat. If a child leaves an encounter, the
shadow stays where it was and they can come back. Nothing rolls back.

## Money, and what it is for

**Münzen.** Earned by clearing a room and by chasing off a shadow.
Spent on a short list of obviously-good things:

* **Ausrüstung** — a cloak, boots, a hat, a better lantern. Cosmetic
  plus one small effect each, so the choice is never wrong.
* **Mut-Kapazität** — a longer courage bar, so the finishing move comes
  round more often.
* **Karten** — a map of a region, which reveals where the dungeons are.

Three or four things visible at a time, each clearly better than
nothing, none better than another. That is the opposite of the shop
that failed.

**Sterne are never spent.** They are the record of what has been
learned, and they only grow. Same rule as the other project and for the
same reason: nothing that measures a child may ever go down.

## What Hack'n'Slash is actually about, and what it changes here

Patrick raised Double Fine's *Hack'n'Slash* — the Zelda-like where your
sword is a USB stick, and you stab an enemy to open an editor on its
own variables and change them.

The gimmick is not the lesson. The lesson is:

> **The subject is the VERB.** You do not answer questions about
> variables. You change variables, and the world changes. The learning
> is not a toll gate in front of the game — it is the interaction
> itself.

Held against the design above, that is uncomfortable, and it should be.
"Walk into a shadow, a quiz appears, right answers push it back" is much
better than an endless runner bolted onto a maths test — but the
arithmetic is still a **toll**, not a **tool**. The child pays to
proceed.

The Hack'n'Slash version puts the numbers in the world as objects:

* A bridge has seven planks and needs ten. You carry the **3** from
  somewhere else and drop it in. A number bond becomes a physical act.
* A gate shows **6 + ?**. The 4 is somewhere on the map.
* A shadow is made of a number. Split it into the two that make ten and
  it comes apart.
* A dark lantern wants a word. Carry **Ma** to it and then **ma**, and
  it lights up saying *Mama*.

### And the reason it cannot be the whole game

The honest objection, and it is a real one: **puzzles build
understanding, and understanding is not the goal.**

DESIGN.md was explicit about this on the other project, and it was
right: the target is *automatic* recall of the pairs to ten. A child who
has to work out that 6 needs 4 will still be working it out when the
class has moved to two-digit addition. Automaticity comes from
repetition, and a puzzle you solve once is not repetition. A pure
Hack'n'Slash design would be more interesting and would teach less.

It is also, practically, a generator problem: LernInseln's question
machinery produces unlimited well-scheduled practice. Authored puzzles
produce eleven.

### So: both, in different places

Which is exactly how Zelda is built, and worth stealing wholesale.

| where | what | what it is for |
|---|---|---|
| **Overworld** | number-objects you carry and combine, gates that want a pair, lanterns that want a syllable | **using** what you know — understanding, delight, the reason to walk |
| **Dungeon** | the LernInseln generators, spaced repetition, the ten-frame | **building** what you know — the drill that makes recall automatic |

In Zelda the dungeon gives you an item and the overworld is where you
use it. Here the house teaches you a fact and the world is where it
turns out to be worth knowing. That is the same structure, and it is
the answer to Patrick's question about ANTON: their games are a
different activity bolted beside the learning, and this one is the same
activity twice, from two directions.

## The shape of a session

1. You are on the map with your character.
2. You walk. Sometimes a shadow turns up.
3. Answering pushes it back. It leaves. You get coins.
4. There is a door: **Das Haus der verliebten Zahlen**. You go in.
5. Ten questions, in rooms. Luma says what is going on.
6. You come out stronger. A gate you walked past is now open.

Three minutes for an encounter. Ten for a dungeon. The same session
length as before, in a shape a child recognises from every game they
will ever play.

## What is lifted from LernInseln, and what is new

**Lifted, unchanged:** the closed palette and the pixel buffer, the
whole art pipeline and its contact sheets, the ElevenLabs build-time
voice, the effects layer, the offline PWA shell, the verification
harness, and — most valuable of all — **every question generator and
the spaced-repetition scheduler**. The teaching is already built and
already tested. This project is a new *frame* around it.

**New:** save slots, the character and its editor, a walkable world,
encounters, Luma and her dialogue system, equipment.

## What I am not sure about

Written down rather than smoothed over.

* **Random encounters can become an interruption tax.** In Pokémon they
  are famously annoying. They have to be rare, brief, and always
  optional-feeling — probably *visible on the map and walked into on
  purpose*, rather than sprung out of the grass.
* **A walkable overworld is a lot of game.** If the walking is not fun
  on its own, it is a corridor between quizzes and worse than a menu.
  This is the biggest risk in the whole design and it should be built
  and looked at early, before anything is built on top of it.
* **Procedural generation is probably wrong here.** A world a child can
  learn by heart is worth more than a world that is different every
  time; Hyrule is the same Hyrule for everybody. Authored, small, and
  growing.
* **Luma must not talk too much.** Text-heavy is exactly what makes
  children skip. Two sentences, spoken, and only when something has
  actually changed.
