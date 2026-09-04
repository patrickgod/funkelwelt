# Working rules for Funkelwelt

Read this, then **[KONZEPT.md](KONZEPT.md)**, then
**[PLAN.md](PLAN.md)**. If you are picking the project up cold,
**[HANDOVER.md](HANDOVER.md)** is the brief.

Most of these are inherited from `C:\Development\Lernkiste` (LernInseln)
and from `C:\Development\Tidegarden` before it — the same person's
projects, built the same way, where they were paid for the hard way.
**Where a rule has a scar attached, the scar is written down**, because
a rule without its reason gets followed literally and wrongly.

---

## The rules that carried over

1. **The build typechecks.** `tsc --noEmit` gates every build. Never
   bypass it, never ship around it. Note that a failing typecheck means
   `dist/` was not rebuilt — twice on LernInseln a measurement was taken
   against a stale bundle and believed, and then twice more here in one
   afternoon, the second time against a bundle that still held the
   PREVIOUS experiment and so produced a plausible mixture of passes and
   failures. This is no longer prose: `tools/verify.mjs` refuses to
   start if anything under `src/` or `public/` is newer than
   `dist/main.js`. A rule that has failed to stop something four times
   is a wish; this one is an assertion now.
2. **Verify by looking, not by assuming.** Screenshots and measurements
   over reasoning about what the code should do. Five bugs on LernInseln
   typechecked, ran clean, and were obvious the moment somebody took a
   screenshot.
3. **A sprite nobody has looked at is probably wrong.** Use
   `tools/contact.mjs`. It found four broken word pictures, six broken
   island sprites and six letters whose stroke direction was inverted.
   Judge a sprite **at the size and on the background it will actually
   be seen** — alone at 8× on white is how you get a fox the size of a
   cottage.
4. **A new test must be seen to fail before it is trusted to pass.** Run
   it against deliberately broken code first — and **commit before you
   sabotage.** The practice creates a "put it back" step, and
   `git checkout -- src/` is both "put it back" and "throw away
   everything not committed". It ate twenty minutes of the world screen.
   Watch out for the other trap in the same loop, too: a sabotage that
   leaves an unused constant fails the typecheck, `dist/` is not
   rebuilt, and the suite reports that the previous bundle is fine.
   See rule 1; it very nearly worked. So **put the build inside the
   loop** — `npm run build && npm run verify`, every iteration, because
   `verify` does not build — and when you grep the output for the
   checks you care about, **grep for the summary line as well**. A run
   that died before reaching them prints nothing, and nothing looks
   exactly like a quiet pass.
5. **Measure before fixing.** On LernInseln two confident theories about
   a frame-time regression died before anybody instrumented anything;
   the real answer was that the check was measuring the harness. On
   Tidegarden it was four theories in a row.
6. **Numbers in documents are measurements, never estimates.**
7. **Nothing that faces the user is written inline.** Every string goes
   through `src/core/i18n.ts` from the first commit. It is also what the
   voice generator reads, so a string that is not in the table cannot be
   spoken.
8. **Write learnings down** in `LEARNINGS.md` as they are earned, not at
   the end.

## The rules that exist because a child uses it

9. **Nothing leaves the device.** No network calls, no analytics, no
   fonts from a CDN, not even an error reporter. `tools/verify.mjs`
   checks every request's origin, so this is a fact rather than an
   intention.
10. **There is no fail state and no way to reach one.** No red X, no
    buzzer, no "wrong", no score that can go down. A mistake shows the
    right answer as a picture and moves on.
11. **A wrong answer costs nothing that cannot be tried again.**
    Amended by Patrick after playing it, and the amendment is narrow, so
    read both halves.

    What CHANGED: in the houses, a wrong answer flashes the card red,
    the answer is NOT revealed, and the child tries the same question
    again. Three wrong answers and the house starts from the beginning.
    His words: "einfach kurz rot aufleuchten und nochmal probieren
    lassen. erst bei 3 'strikes' beginnt das haus von vorne."

    What did NOT change, and must not: no health, no coins taken, no
    stars taken, and nothing at all is lost in a shadow encounter — Mut
    only ever fills. The strikes are gold circles rather than red
    hearts and they are on screen from the first question, so the third
    one is something a child watched coming rather than something that
    happened to them.

    The reason the change is defensible is the RETRY. Being shown the
    answer and moved along is an ending; "not that one, have another go"
    is what a person sitting beside the child would say. If you are
    tempted to add a cost on top of this, don't — that is the RPG
    framing KONZEPT.md warns about, and this is as far as it goes.
12. **Every child-facing interactive thing is at least 64×64 CSS
    pixels** with clear space around it. Apple's 44pt is for adults.
    The suite measures this. The one deliberate exception is the slot
    delete button, which is 44px *because* it should be hard for a child
    to hit.
13. **Tap is the primary interaction.** Never require a drag, a swipe or
    a long-press to answer a question — a motor slip must never read as
    a wrong answer. (Tracing is the one exception, and there the drag
    IS the exercise.)
14. **No text is load-bearing.** The child cannot reliably read yet. If
    an instruction cannot be shown with a picture, an animation or a
    sound, it is the wrong instruction.
15. **Sound is optional and off-switchable in two taps**, because this
    gets played in waiting rooms.
16. **The home-screen icon is part of the app.** It is the only thing a
    child sees before the game is running and the one thing no
    screenshot of the game shows. Judge it with `tools/iconsheet.mjs`,
    at the sizes iOS actually draws and behind the squircle — never at
    512 on white. The suite checks that every referenced icon exists, is
    the size it claims, and is fully opaque, because iOS composites
    transparency onto black and a transparent icon is a black square on
    a home screen.

## Technical shape

Deliberately the same stack as LernInseln and Tidegarden, so the
tooling, the muscle memory and the pixel-art pipeline all transfer.

* **TypeScript**, no framework, bundled with **esbuild**.
* **Canvas** for the world, plain **DOM** for menus and buttons — the
  DOM is better at buttons and canvas is better at pixels.
* **One closed palette, and nothing outside it** (`src/core/palette.ts`).
  Shading means **stepping along a ramp**, never multiplying a colour.
  Light comes from the upper LEFT, always.

  This — not "drawn in code" — is the rule that was actually keeping the
  world coherent, and it took Patrick asking to drop the other one to
  notice. A cherry tree and a fox and a little house read as ONE island
  because they share 117 colours and one light direction, not because a
  human typed their pixels.

* **How a sprite gets made is a decision about SIZE.**

  Big things are generated and then forced onto the palette:
  `tools/genkunst.mjs --was sprite` draws it, `tools/pixelise.mjs` finds
  the grid the model implied, area-averages down, and snaps every pixel
  to the nearest palette colour — with `--ramps` naming which drawers it
  is allowed to land in. Both are lifted from Tidegarden, where the
  pipeline was built. `node tools/pixbatch.mjs` runs the whole set.

  Small things stay drawn in code, and the threshold is **about 24
  pixels**. That is measured, not guessed: a 100px house and a 34px tree
  come back better than anything worth hand-coding, a 24px signpost
  survives, and a 16px bush comes back as a pink smear. Tidegarden found
  the same line from the other side — its villagers, rabbits, birds and
  glints stayed code because they were *too small for generation to
  survive the downsample*.

  So: the adventurer (18×26), every 16×16 ground tile, the lightsparks,
  the ten-frame, the icons and the effects are drawn. The house, the
  trees, the lamp post, the signpost and the rock are generated. Both
  halves land on the same palette, and `welt.ts` cannot tell them apart
  — which is the test of whether this was done properly.

* **Luma's portrait is neither.** She is a painting, not a sprite, and
  she is in a box in FRONT of the world rather than in it — which is
  where Final Fantasy, Persona and modern Zelda put theirs. She is the
  only thing in the game not on the closed palette, and the coded 46×46
  version of her in `src/spiel/luma.ts` stays as the offline fallback.

* **`localStorage` only**, wrapped so a private-mode failure degrades to
  "this session only". Keyed, because there are three save slots.
* **GitHub Pages** deploy from this repo, gated on the suite.
* **Playwright** for verification, at real iPad viewport sizes, with
  touch emulation and `tap()` rather than `click()`.

## Structure

```
src/
  core/     palette, pixel buffer, storage, save slots, audio, fx, i18n, icons
  spiel/    the adventurer, and the game's own systems
  welt/     the world, its tiles and what lives in it
  ui/       screens and widgets
tools/      build, verify, screenshots, contact sheets, icons, voice
public/     index.html, style.css, manifest, service worker
devlog/     the public diary — see DEVLOG-STYLE.md before writing one
```

Tools worth knowing about:

```
npm run build        typecheck, then bundle into dist/
npm run serve        http://localhost:8323
npm run verify       the suite: iPad viewport, real taps, offline, icons
node tools/shot.mjs              screenshots into shots/
node tools/contact.mjs held      every direction and walk frame, one sheet
node tools/iconsheet.mjs         the icon at the sizes iOS draws it
node tools/icons.mjs             regenerate those icons
node tools/devlog.mjs            reassemble DEVLOG.md from devlog/*/article.md
node tools/messen.mjs            what opening the world and walking cost
node tools/pixbatch.mjs          generate + pixelise the whole sprite set
node tools/pixelise.mjs a.png b.png --height 34 --ramps leaf,timber --clean
node tools/genkunst.mjs --was titel --varianten
```

`messen.mjs` is deliberately NOT part of `verify.mjs`. A headless
Chromium on a desktop under software rendering is not an iPad, and
LernInseln already shipped a frame-time check that turned out to be
measuring the harness. Read its numbers as a bound on the work the app
does, never as a frame rate a child would see.

`DEVLOG.md` is **generated**. Edit `devlog/<entry>/article.md` and rerun
the tool; two hand-maintained copies of the same prose are one copy and
one lie.

## What is lifted from LernInseln, and how

`C:\Development\Lernkiste` is the previous project and most of it is
worth taking rather than rewriting:

* `src/core/palette.ts`, `px.ts`, `fx.ts`, `icons.ts` — **already
  copied**.
* `src/games/*` — the question generators, the word list, the word
  pictures, the writing font and the spaced-repetition scheduler.
  **Not yet copied.** This is the teaching, it is already built and
  already tested, and it is the reason this project is a new *frame*
  rather than a new app.
* `tools/genvoice.mjs` — build-time ElevenLabs. The key lives at
  `c:/development/fallennights2d/.env` and needs the `text_to_speech`
  permission.
* `LEARNINGS.md` over there is worth reading before repeating anything
  in it.

## What "done" means for a change

A change is done when it typechecks, `npm run verify` passes, a
screenshot at iPad resolution has actually been **looked at**, and — for
anything a child touches — someone has asked *what happens if they tap
it twice, or with two fingers, or halfway through the animation.*
