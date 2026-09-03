# A world to walk in

*Devlog 0003. The plan said the walking was the biggest risk in the project, so the walking got built before anything was built on top of it. A lantern that turned out to be invisible, a character who was walking around inside a barrel, and 430 milliseconds that were not where anybody thought they were.*

![The house, the path, and the lantern](10-welt.png)

The plan for this game has one line in it that reads like a warning, because it is one:

> *If the walking is not fun on its own, it is a corridor between quizzes and worse than a menu.*

That is the whole risk of an RPG built around arithmetic. The theory is lovely — you meet something, you use what you know, you get stronger, you reach harder places — and it collapses entirely if the bit between the questions is boring. Then it is a quiz with a longer loading screen.

So the rule was: build the walking, put nothing else in it at all, and go and walk around for two minutes.

## The region is thirty-six lines of text

The first decision was the one I was least sure about, and it is settled now: **the world is authored, not generated.**

The argument for procedural generation in a small project is that it is cheap. The argument against it here is that a child should be able to say *the pond is past the big tree*, and mean it, and be right tomorrow. Hyrule is the same Hyrule for everybody. A world you can learn by heart is worth more than a world that is different every time, and for a six-year-old it is worth a great deal more.

So the first region is a text file. Forty-eight characters wide, thirty-six lines tall:

```
##.....================s~~~~~~~~~~~~~=...,....##
##.,..."......=...,....ss~~~~~~~~~~~s=t.......##
##..ffffffff..=.........ss~~~~~~~~~ss=..,.."",##
##T.t.....T...=T..T......ss~~~~~~~ss.=.......T##
```

`#` is cliff, `~` is water, `=` is path, `T` is a tree, `H` is the house, `*` is a lamp post, `F` is a lightspark. It can be read, edited and diffed by a person, which an array of 1728 numbers cannot. When I want the path to go somewhere else I move some equals signs.

The first draft came out of a throwaway script — I placed the pond and the stream and the wood deliberately and let it scatter the flowers — and its output is now the artifact. The script is gone. The text is the map.

**Method: make the agent's output a thing a human can edit.** The temptation with a generated world is to keep the generator and treat its output as a build artifact. Then every tweak is a conversation with the generator instead of a one-character edit. Generating the *first draft* and then throwing the generator away gave me something I can change in five seconds and the agent can change too.

The map also checks itself at load. Every row must be exactly 48 characters, there must be a house, and — the one that actually caught something — **the path must be a single connected run**, breadth-first from the tile the adventurer starts on. The first version had the path crossing the pond, because I had moved the pond and not the path. The assertion said `99 of 99 tiles reachable` on the version that shipped and something much less flattering on the version before it.

## The lantern was invisible

![The pond, and the lamps along the path](12-teich.png)

The fiction of this game is that the world has gone dim and a child arrives with a lantern and learns it bright again. I wanted that to be literal rather than a line of dialogue, and the way to do it is cheap: composite the whole region twice, once at full brightness and once a step darker, and show the bright copy only through a disc around the character.

It works, and you could not see it.

Here is where I would normally have started guessing. Instead — the rule this project keeps re-earning — I sampled the actual pixels of the actual frame. Grass next to the adventurer came back as `84,133,68`. Grass out in the dark came back as `63,108,58`.

So the lighting was working perfectly. The step was real, about twenty per cent, and it read as *nothing at all*.

The reason is that a single step gives you two states and no falloff, and the lit disc covered most of the screen, so there was nothing on screen to compare it against. The eye needs the gradient more than it needs the depth. The fix was a third copy of the region and a second, wider ring: dark, half, full. Two steps of shadow with a band between them, and suddenly there is a lantern.

**Method: sample the frame, do not squint at it.** "I can't see the effect" and "the effect isn't happening" are different bugs with different fixes, and eight lines of `getImageData` tells you which one you have. I would have spent the next twenty minutes debugging a compositing path that was already correct.

The falloff is dithered rather than smooth, and that is not nostalgia. This whole game is drawn from a closed palette of ramps, and a gradient overlay would put colours on screen that are not in it — which is exactly the thing that makes pixel art look like pixel art with a filter on top. A 4×4 ordered dither gives a soft edge out of nothing but *this pixel is lit or it is not*.

Then the lamp posts became light sources on the same mask, which cost about four lines and paid for itself immediately: the path is now literally lit, and following the lights is following the path. That is a signpost that needs no words, and the rule in this project is that no text may be load-bearing, because the child cannot reliably read yet.

## The sparks, and what they are allowed to pay

The playtest that started this whole project found two things: collecting worked, building did not. So there are ten **lightsparks** scattered off the path, in corners, and you pick one up by walking into it. Nothing to press.

They pay **coins**. They do not pay stars.

That distinction is the entire economy of the game and it is worth being pedantic about. Stars are the record of what a child has *learned* — they only ever go up, they are never spent, and they are what opens gates. Walking about is not learning. If wandering earned stars, the number that measures the child would stop meaning anything, and a number that measures a child and can be gamed is worse than no number.

There is a test in the suite that says exactly this: after picking up a spark, three coins and zero stars.

## The barrel

![Every direction, every frame, on grass](16-held.png)

The adventurer was finished two weeks ago. Four directions, three walk frames, six looks. I had looked at the contact sheet and signed it off.

Then I walked him east for four seconds and he was moving around inside a barrel.

In profile, both legs were drawn at the same height, in the same colour, three pixels apart — so they merged into one brown block as wide as his body. And the lantern hung at hip height directly over the back leg, which in a side view *is* the walk cycle. So the walk did not read, and the thing he was carrying read as a briefcase.

The infuriating part is that this is the same bug the front view had, written down in this project's own learnings file — *legibility at small sizes comes from gaps, not from detail* — in the one direction the contact sheet had only ever been asked to show standing still. A standing profile with two legs in the same place looks completely correct. It is exactly right, in fact. It only breaks when it moves.

The fix: the legs swing forward and back rather than up and down, the far one is two steps darker so it reads as behind, and the lantern moved up to chest height and out in front, held at the end of a visible arm.

**Method: the contact sheet is not enough for anything that moves.** Review the sprite where it will be seen, at the size it will be seen, doing the thing it will be doing. A grid of poses will pass a walk cycle that does not work.

## 430 milliseconds, and the wrong theory

Opening the world took 430 ms. That is a title screen that has stopped responding, and whatever it is on a desktop it is worse on a five-year-old iPad.

My theory was the obvious one: the region is composited from 1728 tiles, twice over for the two frames of water ripple, so that is 3456 tile builds. Only the water differs between the frames, so I made the second frame a copy of the first with just the two hundred water tiles redrawn.

430 ms became 381 ms. Roughly a tenth of the problem, for the thing I was certain was the whole problem.

The actual cost was one line in a function I did not write today. Stepping the whole region down a ramp works by rewriting every pixel through a lookup, and the lookup was keyed on the colour's hex string — which meant building `#rrggbb` for every one of 442,368 pixels, four times, on every entry to the world. Nearly two million string constructions.

Keying the cache on the packed integer instead, and building the hex string only on a cache *miss*, took it to **155 ms**. Same picture, pixel for pixel.

**Method: measure before you fix, and treat a fix that did not move the number as information.** The tile optimisation was not wrong — it is still in there, it is still a saving. It just was not the bug, and I only know that because there was a number before and a number after. Two projects ago this same rule cost four wrong theories about a frame-time regression before anybody instrumented anything.

## Both steerings, because nobody knows

![The thumbstick, where the thumb landed](14-daumen.png)

How should a six-year-old move a character on an iPad? A thumbstick, or tap-where-you-want-to-go?

I have opinions. Everyone has opinions. Nobody has data, and my son is right there.

So both are built, and the switch is two taps away *inside the world*, so it can be changed in the middle of walking and changed straight back. That is the only setup where a ninety-second comparison is actually possible.

![The switch, in the world, two taps away](18-einstellungen.png)

Two decisions inside the thumbstick that are about children rather than about input:

The direction is analogue and the **speed is not**. A small push walks at exactly the same pace as a big one. Analogue speed punishes a light touch by making the character crawl, and a child reads a crawling character as a broken one.

And only the **first finger down** owns the stick. A second finger is ignored rather than fighting it, because children put both hands on a tablet.

Tap-to-walk got a real breadth-first search over the tile grid rather than "walk towards the tap", and that was a deliberate call: the cheap version grinds along the edge of the pond when you tap the far bank, and it would have lost the comparison for a reason that has nothing to do with which control a child prefers. If you are going to run an experiment, do not rig it.

**Method: when the honest answer is "nobody knows", build both and put the switch where the experiment happens.** It cost maybe ninety minutes. Guessing wrong would have cost a rebuild.

## The tests, and the sabotage

There are eight new checks in the suite: he walks, walls are walls, the thumbstick moves him under a real touch event, tapping a spot walks him there, the steering choice is remembered, a spark can be picked up, it pays coins and not stars, and the world screen has a world in it.

Every one of them was watched failing first. Not as a formality — I broke the collision test, the stick's vector, the pathfinder, the position save, the settings write and the HUD, in four separate runs, and read the output each time. Four checks failed on the first sabotage, three on the second, one on the third.

That is where the interesting mistake of the day happened.

The first sabotage run ended with `git checkout -- src/` to put everything back. Which it did — including twenty minutes of work that was not committed yet. Six files of it, silently reverted, and I only noticed because the next build was missing an import.

**Method: commit before you sabotage.** Deliberately breaking your own code to check that your tests notice is a genuinely good practice, and it means you now have a "put it back" step, and "put it back" and "throw my work away" are the same command. Commit first and the sabotage is free.

There was a second one on the same run, and it is written in this project's rules file in so many words: *a failing typecheck means `dist/` was not rebuilt*. My first sabotage left an unused constant, the build failed, and the suite happily ran against the previous bundle and reported that everything was fine. I nearly believed it. That warning is in the rules file because it cost somebody two days on the last project, and it still very nearly worked on me.

## What is still soft

**The door does nothing.** There is a house on the map with a lit doorway on the path, and walking into it gets you a chime and a burst of sparks and nothing else, because the house is the next piece of work and inventing a room to put behind it would be worse than leaving it shut. A child will try that door in the first ten seconds. It is the most obvious thing on the screen.

**Nobody has run the two-minute test.** A grown-up walks around with nothing else in the game and does not get bored — that is the bar the plan set, and the person whose opinion matters is six and has not seen it yet. Everything above is a bet that the pond and the lamps and the sparks are enough. It might not be.

**The region is 48 by 36 tiles because I had to pick a number.** "Small enough to learn by heart" is the design goal and it is not a measurement. About nine iPad screens is my guess at it. It is a guess.

And there is one more thing I noticed and left alone: one of the six outfits is an ochre tunic almost exactly the value of one of the four skin tones, so that character reads as a blob. It has been there since the editor was built. Now that it is next to a lantern I can finally see it.
