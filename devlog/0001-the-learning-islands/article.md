# The learning islands

*Devlog 0001. My son is in year one. I had a folder of documentation and no code. Twelve hours later there was a learning app on GitHub Pages with a voice, three islands and handwriting — and a list of bugs that all typechecked perfectly.*

![The island of numbers](10-island.png)

This one is not about Tidegarden. It is a different project with the same method, and I think that is the interesting part: everything I learned making a game with an agent transferred directly to making something for my son.

The short version of the brief: he is learning **Zahlenfreunde** — the pairs that add to ten. One and nine. Two and eight. Knowing those cold is one of the real turning points in early arithmetic, and I wanted something aimed at exactly what his class is doing this month.

We use ANTON at home. It is good. But the games in it are an endless runner and a Flappy Bird clone, and they have nothing to do with the maths. I wanted to show him — and honestly, to show other parents — that a game can be beautiful, and that the learning can be the game rather than the toll you pay to reach it.

## I started with documents and no code

The folder had four markdown files and nothing else. A design document, a rules file, an iPad file, and a handover. I had written them in a previous session deliberately, and this is the first thing I would tell anyone starting a project this way.

The rules file is the one that does the work. Not "write clean code" — actual rules with actual reasons:

> *Nothing that faces the user is written inline. Every string goes through a table from the first commit. Retrofitting this cost a week elsewhere; doing it on day one costs nothing.*

> *There is no fail state and no way to reach one. No red X, no buzzer, no "wrong", no score that can go down. A mistake shows the right answer as a picture and moves on.*

**Method: give the agent a rules file early, and attach the reason to every rule.** A rule without its reason gets followed literally and wrongly. A rule with its reason gets applied to situations you did not think of — and I watched that happen about six times over the day.

## The first thing I changed was the whole shape

The documents described a "Lernkiste", a learning box, with a meadow that fills up with creatures as you master number pairs.

I looked at it and asked for something else: islands. A child picks an island, walks up to a house, goes in, does ten questions, and earns points to make the island theirs. Two currencies. Stars that only ever go up, and sweets to spend.

The design document argued *against* points. It said streaks punish the day you were ill, and stars out of three turn practice into a graded test. It was right about all of that. What I got back was not a shrug — it was a new section appended to the design document that answered the objection rather than deleting it:

> *Sterne only ever go up. They are a record of what has been learned and they unlock houses. Bonbons are the only number in the app that can go down, and only because the child chose to spend them on a sheep — that is agency, not punishment.*

**Method: when you overrule a design document, make the agent write down why, in the document.** Otherwise you get an app whose rules and whose docs disagree, and in three weeks neither of you knows which one was the decision.

## Everything is drawn in code

No image files. Not one. Every tree, every house, every animal is a function that returns a pixel buffer, on a closed palette of about a hundred and twenty colours lifted straight from Tidegarden.

That decision pays twice. Variety is free — one function makes a family of houses rather than one house. And the fourth fruit tree costs one line, because apple, pear and plum are the same generator with a different leaf ramp and fruit ramp.

The shading rule is the same one Tidegarden runs on: **shading is stepping along a ramp, never multiplying a colour.** Multiplying gives you the same hue at lower brightness, which is exactly what makes cheap art look muddy.

## Five bugs that typechecked, ran clean, and were completely obvious in a screenshot

This is the part worth the whole post.

**The device pixel ratio.** The renderer did `ctx.setTransform(scale, 0, 0, scale, 0, 0)`, which threw away the `dpr` transform the caller had already set. The island drew at half size in the top-left quarter of the canvas. Invisible at dpr 1 — which is every desktop browser at default zoom — and obvious on an iPad.

**The ink rim traced the ground shadow.** Every tree, animal and building stood in a little black box. The outline routine outlines anything with alpha above 8, and a soft contact shadow is alpha 13 to 70. The fix was ordering, not logic: the shadow goes on *after* the rim.

**Tile-space neighbours confused with screen-space ones.** In this projection the tile at `(x, y-1)` is up and to the *right*. The foam code assumed left, so surf appeared on the wrong side of every coastal tile and drew long diagonal streaks across open water.

**A full-screen layer that ate every tap.** `#ui > * { pointer-events: auto }` beat the plain `pointer-events: none` on the house-label layer, so the island and every button under it went dead. The app looked completely normal in a screenshot. The only thing that noticed was a Playwright `tap()` timing out.

**Particles under the interface.** The end-of-round panel paints across the whole screen, and the effects canvas was below it — so the stars flying into the counter, the one moment the entire reward is built around, were invisible.

![Stars flying into the counter](24-reward.png)

Every one of those passed the typechecker. Every one ran without an error. **Method: review the artefact, not the diff.** Make the agent take a screenshot at the real device size and then *look at it yourself*.

## The contact sheets

The single highest-value tool in the project, and it is forty lines.

It bundles the sprite module on its own, draws everything it exports onto one canvas, and screenshots it. Three of them ended up existing: word pictures, island sprites, and the writing alphabet.

![The word pictures](14-word-pictures.png)

The first twelve word pictures went in and four were bad. The cat had its ears tucked inside the head outline where they vanished, and whiskers crossing its face — a round brown blob that read as an animal in pain. The duck's tail was a one-pixel diagonal that read as an aerial. The hedgehog was a potato with a nose.

![Everything on an island](16-island-sprites.png)

The island sheet was worse: six of twenty-two sprites were wrong. The well was a grey blob with an orange trapezoid hovering over it, because the roof was drawn wider than its posts and never met them. The boat was a white triangle over a smudge — the hull was dark on dark water and simply vanished.

And the sheep was Tidegarden's oldest lesson happening a second time. It read as a white pebble. The fix was the same both times: **the fleece has to be bright and bumpy and the head has to be dark and outside it.** Contrast between the parts is what makes a small thing legible.

**Method: judge a sprite at the size and on the background it will actually be seen.** The island sheet draws each sprite at island scale, on the ground tile it stands on, with a house behind it for reference. Judging one alone at 8× on white is how you end up with a fox the size of a cottage.

The deeper lesson was about generalisation. There had been a shared `critter()` body plan — an ellipse with four dots for legs — and it produced five animals that all read as the same grey lump. Each had to be drawn on its own before any of them worked: the hen upright with a comb, the cat *sitting*, the duck with its head up on a neck, the fox a triangle with a brush. **A shared anatomy is right for a family of buildings and wrong for a family of animals.**

## The voice

Short lines are read aloud, because he is six and cannot reliably read an instruction. That is not a nicety; the rules file says no text may be load-bearing.

ElevenLabs, but **at build time**. The generator reads the string table, sends about 1,900 characters, and writes MP3s into the repo. The running app has never heard of ElevenLabs and makes no network calls at all — which is the only way the offline promise survives. The whole voice set is 89 files and 912KB after ffmpeg trims the silence and drops it to mono.

Three things made it actually feel warm, and only one of them was a knob.

The knob was stability 0.62 to 0.45 with a touch of style. The first pass was correct and flat.

The other two were about repetition, which is the real enemy when a child hears a line a hundred times. **Every house has two greetings** — the full explanation the first time it is opened, a short warm one afterwards. Explaining the rules again on every visit talks down to the child who has just learned them. And **praise comes in three**, picked at random, because the same sentence every time stops being praise and becomes a noise the app makes.

## Turning promises into tests

The rules file said "nothing leaves the device". That was a comment for a week.

It is now a check that watches every request and compares its origin to the page's own, and it will go red the day somebody adds a font from a CDN. Same for "there is no screen that says you did badly" — the suite plays a whole round answering at random and then greps the result screen for *falsch*, *leider*, *schade*, *verloren*.

**Method: turn design promises into assertions.** A promise in a document is a hope. A promise in the test suite is a property of the software.

The suite also caught the two most instructive bugs of the day, and both were bugs *in the tests*.

The round check tapped random cards and asserted that some stars had been awarded. With three cards, ten random taps miss everything about once in sixty runs — and it duly turned the deploy red on a build that was completely fine. Worse: a game that scored the *wrong* card as correct would have sailed straight through it. It now plays the round deliberately, working the answer out from what is on screen, and asserts exactly ten stars and fifteen sweets.

**Method: check that a new test can actually fail.** Before trusting that one, the partner-to-ten was changed from `10 - n` to `9 - n`; the check reported `stars=0` and failed, and passed again when it was put back. Two minutes.

The second was a performance check that went red on a build whose renderer had not changed. It was timing the gaps between animation frames — which in a headless browser is the scheduler and the load on the machine. It read 17ms on an idle laptop and 35ms on a busy one while the actual drawing never moved from about two milliseconds.

Two confident theories died before anybody measured. The new campfire particles: innocent, 2ms. A layout flush in the label placement — reading `getBoundingClientRect` once per label per frame, which genuinely is a bad idea and genuinely was there: also innocent, 0.04ms.

Tidegarden's rule held exactly. **Measure before fixing.** The instrumentation took five minutes and would have taken five minutes at the start.

## The night shift, again

At about midnight I said I was going to bed, and to keep extending it until seven.

In the morning there were fourteen commits.

Hearts instead of circles in the ten-frame — two numbers that make ten are *verliebt*, and the house is named after it, so the counters are hearts and the partner that arrives on a correction is a red one among the pink.

![Hearts in the ten-frame](12-hearts.png)

An island that reacts to what you build. Three trees bring birds. A pond brings ducks. A fence gets a sheep, a flower bed gets butterflies, a hive brings bees, and the lighthouse brings a boat across the water. All of it stateless — a pure function of the clock and what has been placed — so a week away costs nothing to resume.

That one is a design argument rather than a feature. Buying a pond and later noticing that the ducks came *on their own* teaches a child something about cause and effect. A duck you simply bought teaches them about a shop.

Day and night on the real clock, so a child playing after dinner sees a different island from the one they saw after school.

![The island at night](22-night.png)

And there is a decision inside that which I like a lot. Night could not be made much darker: every colour steps down its own ramp, and two steps in, most of them clamp to the bottom and the picture loses its contrast. A darker island would have been *less* legible at bedtime and no more atmospheric. So instead of subtracting light, it adds it — lit windows, a lantern, a campfire, and seven fireflies over the wood that blink out of step with each other.

## Writing

The last thing built, and the one I am most pleased with.

![Writing Lea](20-writing.png)

His class writes syllables — La, Li, Mo — and then the words they make: Mama, Oma, Lea, Limo. So the app does too, with a finger.

The obvious way is handwriting recognition. It is the wrong choice, for two reasons, and the second matters more.

A classifier has to **guess**, and a six-year-old's letters vary enormously. Every guess it gets wrong tells a child they wrote it badly when they did not.

But a finished letter **cannot tell you how it was made**. An M drawn from the bottom up looks identical to a correct one and is a habit that costs years. Direction and stroke order are the actual content of first-grade writing, and they only exist while the pencil is moving. Tracing is the only way to see them — so the app checks something a picture-matcher could not.

Which means a **stroke font**: every glyph a list of strokes in the direction a hand really moves, in Grundschrift, with the orders the primers use. Verticals top to bottom. Round letters anti-clockwise from the top. A letter splits where the hand would really lift.

![The alphabet, with stroke order](18-alphabet.png)

Six of the seventeen glyphs were wrong in the first draft and only a contact sheet showed it. In screen coordinates y grows *downward*, so an increasing angle sweeps clockwise — which made every round letter turn the wrong way and drew both `u` and `U` as arches over the top instead of bowls underneath. All four looked like letters. None of them were.

Note what the sheet had to show to catch that. Not the shape — the shape was fine. It draws every stroke **numbered and arrowed**, because the direction is the content.

**Method: your review artefact has to show the property you care about**, which is often not the obvious one.

The check itself: each stroke is a run of checkpoints, and the child has to touch them in order, each within about a fingertip, without lifting. Forgiving enough that nobody has to be accurate — only to go the right way — and strict enough that a scribble does not pass. Straying does nothing at all. There is no buzzer and nothing to lose.

And the test suite writes. It asks the widget for the stroke it is currently expecting and drags along it, then scribbles straight across a letter first and checks that *nothing happens*. That second assertion is the one that proves the check is real rather than generous. Both found bugs: `Salami` was in the two-syllable word list and has three, and the dot on an `i` is touched rather than drawn, so every syllable with an i in it was ending the test two strokes early.

## Where it is

Three islands, ten houses, twenty-seven things to build, a voice, and handwriting. It is at [patrickgod.github.io/lerninseln](https://patrickgod.github.io/lerninseln/) and it installs to an iPad home screen and works with no signal.

## What is still soft

I played it with my son.

Two findings from one session, and they were not the ones I expected. **Collecting worked** — stars, sweets, coins, a number going up. **Building did not.**

That is the honest result, and the next entry is about what I think it means, because I do not think it means "building is boring". I think it means building was a second job, and that the whole reward structure needs rethinking rather than tuning.

The islands are not going away. But the next thing I make is different.
