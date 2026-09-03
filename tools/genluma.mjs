// Luma's portrait, drawn by Gemini at BUILD time.
//
//   node tools/genluma.mjs              # if assets/luma/luma.png is missing
//   node tools/genluma.mjs --force      # again
//   node tools/genluma.mjs --varianten  # four to choose from, into art_raw/
//   node tools/genluma.mjs --model gemini-3-pro-image
//
// Key: GEMINI_API_KEY, or C:\Development\shortsmith\.env.
//
// WHY THIS IS THE ONE EXCEPTION TO "EVERY PIXEL IS DRAWN IN CODE"
//
// AGENTS.md is emphatic that nothing in this game is an image file, and
// that rule has earned itself: it is why a cherry tree and a fox and a
// little house drawn months apart still read as ONE world, and it is
// what makes a new outfit cost a ramp rather than a drawing.
//
// Luma is the exception, and it is a deliberate one that PLAN.md has
// carried since the concept was written. The reason is that she is not
// part of the world — she is a portrait in a box in FRONT of it, which
// is exactly where Final Fantasy, Persona and every Zelda since Wind
// Waker put their illustrated art: pixels in the world, a painting in
// the dialogue box. The contrast is the convention, not a mistake.
//
// She is also the one thing in this game a six-year-old looks AT rather
// than plays with, for a few seconds at a time, at a hundred and forty
// pixels tall. A coded 46x46 sprite cannot carry that, and the one I
// drew proved it: it was legible, on-palette, and about as warm as a
// bus timetable.
//
// This still runs at build time and writes a file. The running app has
// never heard of Gemini, makes no network call, and `tools/verify.mjs`
// checks every request's origin — so the offline promise is untouched.
//
// The coded portrait in `src/spiel/luma.ts` stays as the fallback, so
// the game is never broken by a missing file.

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const VARIANTEN = args.includes('--varianten');
const MODEL = args.includes('--model') ? args[args.indexOf('--model') + 1] : 'gemini-3-pro-image';
/** Skip the drawing and process a variant that has already been chosen. */
const AUS = args.includes('--aus') ? args[args.indexOf('--aus') + 1] : null;

const ZIEL = 'assets/luma/luma.webp';

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const p of ['C:/Development/shortsmith/.env', '.env']) {
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/GEMINI_API_KEY\s*=\s*"?([^"\r\n]+)"?/);
    if (m) return m[1].trim();
  }
  throw new Error('no GEMINI_API_KEY found');
}

/**
 * The brief.
 *
 * Written as a brief rather than as a pile of adjectives, because that
 * is what actually steers an image model: who she is, what she is for,
 * where she will be seen, and — the part everybody forgets — what she
 * must NOT be. The last section is doing the most work here. A prompt
 * for "a fairy" without it comes back with something a six-year-old
 * should not be handed.
 */
const BRIEF = `A character portrait for the guide character in a gentle
role-playing game made for a six-year-old child.

WHO SHE IS
Luma, a young fairy made of light. She is the only character in the game
who explains anything: she turns up, says two warm sentences, and goes.
Kind, calm, quietly delighted by the child she is talking to — a big
sister rather than a mascot, and young enough to be one. She carries the
memory of a world that has gone dim and she is genuinely glad someone
has finally come with a lantern.

STYLE
Hand-painted JRPG character art in the tradition of Final Fantasy and
Persona portrait boxes, and of the illustrated guide characters in
modern Zelda. Painterly digital illustration with clean confident line
work, soft cel shading and warm rim light. NOT pixel art, NOT 3D
rendered, NOT a photograph. The game world behind her is pixel art and
the deliberate contrast between the two is the look.

CROP — this matters more than anything else here
HEAD AND SHOULDERS ONLY, filling the frame the way a passport photograph
does. The top of her hair almost touches the top edge. Her chin sits at
the vertical middle of the picture. Her shoulders run off the left and
right edges and are cut by the bottom edge. Do NOT show her waist, her
arms or her hands. Do NOT leave empty space around her.

POSE
Turned very slightly to her left so she faces the text that will sit
beside her, looking straight at the viewer, with a soft closed-mouth
smile. Warm brown eyes with a bright catchlight — her eyes are lit, they
do not themselves glow.

WINGS
Two small translucent insect wings behind her shoulders, pale sea-green
edged with gold, catching the light. Small: they frame her shoulders and
must not crowd or rise above her head.

PALETTE
Warm gold and honey hair that glows softly from within as if lit by a
lantern. Pale cream skin with a warm blush. Deep plum and indigo
shadows, never grey or black. A pale sea-green dress with a high soft
collar. A few motes of golden light drifting near her hair. Warm light
against a deep dark, because she is a light in a world that has gone
dark.

BACKGROUND
A deep near-black plum-purple, flat and simple, with a faint warm halo
directly behind her head, so she reads clearly on a very dark interface
panel.

MUST NOT
No text, letters, numbers, logos, watermark or signature anywhere. No
frame, no border, no matte, no white edge, no vignette — the painting
bleeds to all four edges. No weapons. Nothing sexualised: no exposed
midriff, no low neckline, no cleavage. She is looked at by young
children and she is dressed like a storybook illustration. No grim,
edgy, gothic or melancholy treatment; she is warm.`

async function bild(prompt, path) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey(), 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
      }),
    });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const daten = parts.find((p) => p.inlineData)?.inlineData?.data;
  if (!daten) {
    throw new Error(`no image came back: ${JSON.stringify(json).slice(0, 400)}`);
  }
  writeFileSync(path, Buffer.from(daten, 'base64'));
  return path;
}

/**
 * Down to something a school iPad can afford.
 *
 * This app caches ALL of itself on install so that it works on a train,
 * which makes every kilobyte here part of a first launch on somebody
 * else's device. She is shown at about 140 CSS pixels tall, so on a 3x
 * screen 448 is already generous and the 1024 that comes back is vanity.
 *
 * WebP rather than PNG, and the numbers are the argument: the same
 * picture measured 382 KB as a 512px PNG and 27 KB as a 448px WebP. It
 * is a soft painting with no flat areas and no transparency, which is
 * the exact case PNG is worst at. Safari has had WebP since iOS 14,
 * which is also what esbuild is told to target.
 *
 * The pixel art stays PNG. Lossy compression on a closed palette would
 * invent colours that are not in it.
 */
function schrumpfen(von, nach) {
  try {
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', von,
      '-vf', 'scale=448:448:flags=lanczos',
      '-c:v', 'libwebp', '-quality', '86',
      nach,
    ], { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.log(`  (not shrinking: ${String(e.message).split('\n')[0]})`);
    return false;
  }
}

// ------------------------------------------------------------------ go

if (VARIANTEN) {
  mkdirSync('art_raw', { recursive: true });
  for (let i = 1; i <= 4; i++) {
    const path = `art_raw/luma-${i}.png`;
    process.stdout.write(`  variant ${i} … `);
    try {
      await bild(BRIEF, path);
      console.log(path);
    } catch (e) {
      console.log(`FAILED ${e.message}`);
    }
  }
  console.log('\nLook at art_raw/luma-*.png, then put the one you want through');
  console.log('  node tools/genluma.mjs --force --aus art_raw/luma-2.png');
  process.exit(0);
}

if (!FORCE && existsSync(ZIEL)) {
  console.log(`  ${ZIEL} is already there — use --force to draw her again`);
  process.exit(0);
}

mkdirSync('assets/luma', { recursive: true });
mkdirSync('art_raw', { recursive: true });

// `--aus` is how a choice gets made. Four variants come back from one
// run and exactly one of them is her; picking by eye and then pointing
// this at the file is the whole workflow, and it means the choice is a
// command in the shell history rather than a file somebody dragged.
let roh = AUS;
if (!roh) {
  roh = 'art_raw/luma-roh.png';
  process.stdout.write(`  asking ${MODEL} … `);
  await bild(BRIEF, roh);
  console.log('ok');
}
if (!schrumpfen(roh, ZIEL)) writeFileSync(ZIEL, readFileSync(roh));
const gross = readFileSync(ZIEL).length;
console.log(`  ${ZIEL} — ${Math.round(gross / 1024)} KB from ${roh}`);
if (!AUS && existsSync(roh) && gross > 0) unlinkSync(roh);
