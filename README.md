# Funkelwelt

A small role-playing game for a six- or seven-year-old, in which the
fighting is arithmetic and nothing is ever lost.

**Play it:** <https://patrickgod.github.io/funkelwelt/> — an iPad, in
Safari, added to the home screen. It works with no signal and it talks
to nobody.

---

The world has gone quiet and dim. A child arrives with a lantern and
learns it bright again: shadows are pushed back by knowing things, the
lights come back on, and the map gets bigger.

It is German first-grade material — the pairs that make ten, syllables,
letters, handwriting — inside a game that is actually a game. The
previous project, **[LernInseln](https://patrickgod.github.io/lerninseln/)**,
is where the teaching was built and tested; this one is a new frame
around it. Why there is a new frame at all is the second devlog entry.

## The rule everything else bends around

**Damage goes one way. A wrong answer never costs the child anything.**

There is no health bar, no timer, no streak, no red X and no way to
lose. Right answers push the shadow back; wrong answers do nothing, show
the answer as a picture, and move on. There is **Mut** — courage — and it
only ever fills.

An RPG framing will keep trying to undo this, because that is what RPGs
do. Applied to a maths question, "get it wrong and take damage" says
*not knowing this hurts you*, which is the exact lesson that makes a
child decide at seven that they are bad at maths.

## Reading order

| | |
|---|---|
| **[KONZEPT.md](KONZEPT.md)** | what the game is, and the argument for every part of it |
| **[AGENTS.md](AGENTS.md)** | how to work in this repo — rules, each with the scar that earned it |
| **[PLAN.md](PLAN.md)** | what is next, in order, and why that order |
| **[HANDOVER.md](HANDOVER.md)** | the ninety-second brief for picking it up cold |
| **[DEVLOG.md](DEVLOG.md)** | the diary, including the project before this one |

## Running it

```
npm install
npm run build      # typechecks, then bundles into dist/
npm run serve      # http://localhost:8323
npm run verify     # the suite: iPad viewport, real taps, offline, icons
```

```
node tools/shot.mjs           # screenshots into shots/
node tools/contact.mjs held   # every direction and walk frame, on one sheet
node tools/iconsheet.mjs      # the home-screen icon at the sizes iOS draws
node tools/icons.mjs          # regenerate those icons
node tools/devlog.mjs         # reassemble DEVLOG.md from devlog/*/article.md
node tools/messen.mjs         # what it costs to open the world and to walk
node tools/genvoice.mjs       # Luma's lines, from i18n.ts, at build time
```

Pushing to `master` deploys to GitHub Pages if the suite passes.

## How it is built

TypeScript, no framework, esbuild. Canvas for the world, plain DOM for
menus, because the DOM is better at buttons and canvas is better at
pixels. `localStorage` only, keyed, because there are three save slots.

**Every pixel is drawn in code** on a closed palette — no image files
except the generated home-screen icons. Shading means stepping along a
ramp, never multiplying a colour; the light comes from the upper left,
always.

Nothing leaves the device: no network calls, no analytics, no fonts from
a CDN, not even an error reporter. That is a check in `tools/verify.mjs`
rather than a promise in a document.

## State

Title screen, three Zelda-style save slots, a character editor, a
walkable world, and the first house.

The world came before anything else on purpose, because it is the
project's biggest risk: if the walking is not fun on its own then the
whole design is a quiz with a longer loading screen, and that is much
cheaper to find out now than after four dungeons are built on top.

It is one authored region — thirty-six lines of text in
`src/welt/karte.ts`, not a generator, because a world a child can learn
by heart is worth more than one that is different every time. A path
that loops, a stream with a bridge, a pond, two woods, and a house with
a lit door.

The lantern is literal: the region is drawn at three brightnesses and
the bright ones show only through a dithered disc around the adventurer
and around every lamp post, so the path is lit and following the lights
is following the path. That is a signpost with no words in it, which
matters because the child cannot reliably read yet.

Both touch steerings are built — a thumbstick that appears where the
thumb lands, and tap-to-walk — with the switch two taps away inside the
world. Nobody knows which one a six-year-old prefers, and the person who
can settle it is six.

Walking into the lit door opens **Das Haus der verliebten Zahlen**: ten
questions on the partners to ten, with the ten-frame and the question
generators carried over from LernInseln unchanged rather than rewritten.
Coming out pays **Mathe-Sterne** and **Münzen**, and the level bar moves.

Stars are per subject and are the record of what has been *learned*.
They only go up and are never spent, so a gate that later wants Mathe 3
is a gate the child opened by knowing something. Coins are the spendable
half, and the lightsparks in the grass pay those. Walking about earns
coins; only the house earns stars. That line is a test rather than an
intention.

Luma speaks, in one voice, generated at build time. The running app has
never heard of ElevenLabs and still makes no network calls at all.

**What has not happened yet:** anyone actually playing it. The loop is
whole — walk, find the door, answer ten things, come out stronger — and
the person it is for has not seen any of it.
