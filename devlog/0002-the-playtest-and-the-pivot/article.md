# The playtest, and the pivot

*Devlog 0002. One session with one six-year-old produced two findings and killed half the design. Why "building didn't work" is the wrong diagnosis, why a role-playing game is the right answer, and the one thing an RPG will keep trying to do that would genuinely harm a child.*

![Three save slots](14-slots.png)

I sat down with my son and the learning islands.

He did the maths. He liked the stars. He liked the sweets. He counted them. When a new house arrived on the island he wanted to know what was in it.

Then he opened the shop, and stopped.

## Two findings

**Collecting worked.** A number going up, arriving on its own, as a consequence of the thing he had just done.

**Building did not.**

That is the whole result. One child, one session, no statistics. I am aware of how thin that is, and I also think it is the most useful data the project has produced.

## The wrong diagnosis

The obvious conclusion is "building is boring, find a better toy". I think that is wrong, and getting it wrong leads straight back to the same problem in a new costume.

Building failed because it is **a second job**.

A child who has just answered ten maths questions is handed a shop, a currency, a catalogue of twenty-seven things, an empty meadow, and no goal — and asked to make an aesthetic decision. That is a blank page. Blank pages are hard for adults and much harder for children.

And the loop was four steps long. Earn, open the shop, choose, place. Only the first step had anything to do with what he had just been doing.

Collecting worked because it is **immediate, visible and automatic**. It happens *to* you.

> **A reward that arrives on its own beats a reward you have to go and spend.** If there is spending, it has to be a short list of obviously-better choices, not a canvas.

I want to flag the shape of that sentence, because it is the useful part. "Building didn't work" is an observation. "A reward you have to go and spend is worse than one that arrives" is a rule I can apply to the next design, and to the one after that.

**Method: make the agent state the general rule, not just fix the thing.** I asked what the playtest actually said rather than asking for the shop to be improved, and what came back was a diagnosis I could build on.

## So what replaces it

I had a hunch and typed it out badly and at length: a small RPG. Character creation, three save slots like old Zelda, a world with dungeons in it, experience, gold, a fairy who explains things.

What I got back was agreement with a reason attached, and the reason was better than my hunch:

> **A role-playing game's core loop is already the learning loop.**
>
> ```
>         RPG                        learning app
>   meet something          →   a set of questions
>   fight it with what      →   answer with what you know
>     you know
>   get stronger            →   the facts get easier
>   reach harder places     →   harder material unlocks
> ```

That is not a theme painted over a quiz. It is the same shape. Which is exactly why it should feel unlike ANTON's endless runner sitting beside a maths test — the game part and the learning part are the *same activity*.

And it fixes the observed problem directly. You do not design anything; getting stronger happens to you. What you buy is on your character, on screen every second, not on a map you have to visit. And a purchase opens a gate, so it is never only decoration.

## The thing that must not happen

Here is the part I would have got wrong on my own.

An RPG says: get it wrong, take damage, eventually lose. Applied to a maths question, that reads as **not knowing this hurts you** — which is precisely the lesson that makes a child decide at seven that they are bad at maths.

So the rule, written into the design document in capitals:

> **Damage goes one way. A wrong answer must never cost the child anything.**

Correct answers push the shadow back. Wrong answers do nothing at all — the right answer is shown as a picture, and the next question comes. The shadow never advances.

There is no health bar. There is **Mut** — courage — a bar that only ever fills, and when it is full the lantern flares and the shadow goes at once. That keeps every good feeling an RPG has: stakes, a bar filling, a finishing move. It throws away only the part that would harm somebody.

The monsters are **shadows**, and they are chased away rather than killed. That was my instinct and it survived; what I did not have was the fiction that makes it coherent.

## The world explains itself

A place that has gone **quiet and dim**. Not dangerous — dim. The lights have gone out of it and the words have gone quiet, and the things that live in the dark have got braver than they should be.

A child arrives with a lantern and learns the world bright again.

I like this more than anything else in the document, because it is not decoration. It explains why the monsters are shadows. It explains the fairy — she carries the map of what is still dark. It gives a **progress bar with no numbers on it**: the world lights up. And it is the truthful metaphor. Learning to read really does feel like a light coming on.

## Hack'n'Slash, and the uncomfortable question

I mentioned Double Fine's *Hack'n'Slash* as a possible inspiration — the Zelda-like where your sword is a USB stick, and you stab an enemy to open an editor on its own variables.

The answer I got back did not flatter the reference. It said the gimmick is not the lesson, and then used the lesson against the design we had just agreed:

> **The subject is the VERB.** You do not answer questions about variables. You change variables, and the world changes. The learning is not a toll gate in front of the game — it is the interaction itself.
>
> Held against the design above, that is uncomfortable, and it should be. "Walk into a shadow, a quiz appears, right answers push it back" is much better than an endless runner bolted onto a maths test — but the arithmetic is still a **toll**, not a **tool**.

The Hack'n'Slash version puts the numbers into the world as objects. A bridge has seven planks and needs ten, so you carry the **3** from somewhere else and drop it in. A gate shows `6 + ?`. A dark lantern wants a word: carry **Ma** to it and then **ma** and it lights up saying *Mama*.

And then the objection to its own idea, which is the bit I would not have thought of:

> **Puzzles build understanding, and understanding is not the goal.** The target is *automatic* recall of the pairs to ten. A child who has to work out that 6 needs 4 will still be working it out when the class has moved to two-digit addition. Automaticity comes from repetition, and a puzzle you solve once is not repetition.

So: both, in different places, which is exactly how Zelda is built. The **overworld** is where you use what you know — number-objects, gates that want a pair. The **dungeon** is where you build it — the question generators and the spaced repetition, already written and tested in the previous project.

In Zelda the dungeon gives you an item and the overworld is where you use it. Here the house teaches you a fact and the world is where it turns out to be worth knowing.

**Method: give the agent a reference and ask what it is actually about.** I offered a gimmick. What came back was the principle behind it, applied honestly enough to criticise the plan we had just made — and then a limit on that principle. That is worth far more than agreement.

## What is built so far

![The adventurer](10-adventurer.png)

The adventurer, in four directions and three walk frames, drawn in code on the same closed palette as everything else. Every one of them carries a lantern — which is the story, and is also the one thing in the silhouette that no bush, rock or shrub has.

It took two passes, and the contact sheet earned its keep immediately. The first draft put a full-width fringe two pixels above the eyes, so every character had a dark bar across its face and read as a potato in a bowl cut. It gave the legs no gap, so the walk did not read at all. And it drew the side view as the front view with an extra eye, so three of the four directions were the same picture.

What fixed it: a forehead, three pixels of daylight between the legs, a genuinely narrower head in profile with a nose, and the lantern.

![The character editor](12-editor.png)

Three save slots, and a character editor that shows the character **walking** while you dress it, because that is how it will actually be seen.

Every outfit is offered to every character. Not for a political reason — for a practical one: a great many six-year-old girls want the armour, and a shop with a half marked "not for you" throws away half its own appeal.

The three slots also fix something the previous project had and never admitted: one device, one save. A brother, a classmate or a second go at a different character all had to overwrite the first.

The screenshot caught two things immediately. The hairstyle swatches were three identical cream squares, because a hairstyle has no colour of its own — they are little heads wearing the style in the character's current hair colour now. And the verification suite caught the colour swatches at 52×52, under the 64×64 floor that a six-year-old's finger needs.

## The icon, which is the first thing anyone sees

![The home-screen icon at every size iOS draws it](16-icon.png)

Funkelwelt started with the previous project's icon, because the whole
toolchain was copied wholesale. Two learning games with the same island
on the same home screen is a bug, and it is the kind that only shows up
on the device.

So: a lantern, alight, in a dark world. It is the entire story of the
game in one shape, and it is the one thing on that home screen that
does not look like every other rounded square.

Three things went into it that are worth stealing.

**Judge it at the size it is drawn.** The contact-sheet habit again, and
the same lesson as the sheep that read as white pebbles: the sheet
renders the icon at 180, 120, 80 and 60 pixels, behind the squircle iOS
actually masks it into, on home-screen grey. The first version had a
bright core in the glass *and* a flame, which at 512 looked like a lit
window and at 60 was one warm blob. Removing the brightest colour from
everywhere except the flame is what made it read as a lantern.

**Dither instead of gradient.** The pool of light around the lantern is
rings of scattered pixels, not a smooth falloff — because iOS
downsamples the icon and a smooth ramp turns to mush, while a dither
keeps its texture all the way down.

**Ship the sizes iOS asks for.** 152 on an iPad, 167 on an iPad Pro, 180
on an iPhone. None of those divides 64, so nearest-neighbour scaling
gives some source pixels three output pixels and others two — a visible
stagger along every straight edge, and this icon is nothing but straight
edges. They are scaled up to an exact 512 first and then box-filtered
down, so each output pixel averages a whole block.

And then the promises became four assertions, because an icon is the one
part of the app no screenshot of the game ever shows: every referenced
icon exists, every one is square and is the size its `sizes` attribute
claims, an apple-touch-icon is offered at 180, and every icon is fully
opaque — iOS composites transparency onto black, so a transparent icon
looks perfect in every preview and is a black square on the home screen.

All four were watched failing first: a wrong `sizes`, a deleted file, a
single transparent pixel, and a missing 180 link. Two minutes, and the
alternative is finding out on someone else's iPad.

## What is still soft

Almost everything, and one thing in particular.

**A walkable overworld is a lot of game.** If the walking is not fun on its own, it is a corridor between quizzes and worse than a menu. That is the biggest risk in the whole design, and it is why the next thing built is the world itself, with nothing in it — so that a grown-up can walk around for two minutes and find out.

I would rather discover that now than after four dungeons are standing on top of it.
