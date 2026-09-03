// Generate and pixelise a whole set of sprites in one command.
//
//   node tools/pixbatch.mjs              # everything missing
//   node tools/pixbatch.mjs haus baum1   # just these
//   node tools/pixbatch.mjs --force      # draw them all again
//
// Lifted in shape from Tidegarden's `tools/pixbatch.mjs`, which had
// already learned the two things that decide whether a set comes out
// usable, and both of them are in the table below rather than in the
// prompt:
//
//   THE RAMPS. Each entry names which drawers of the palette its sprite
//   is allowed to be snapped into. Without that, a tree generated with
//   olive foliage lands in the DRY GRASS ramp — because olive really is
//   nearer to dry grass in colour space — and comes out a muddy brown
//   bush. The model chooses the shapes; we choose which colours it is
//   allowed to have chosen.
//
//   THE SIZES. They come from what is already in the game, not from what
//   looks good on its own. A tile is 16 pixels and the adventurer is 26
//   tall; sizing each sprite to look nice by itself is how Tidegarden
//   got a handcart as tall as a cottage.
//
// WHAT IS NOT HERE, AND WHY
//
// The adventurer, the tiles, the lightsparks, Luma's companion bubble.
// Tidegarden's own table says it plainly: villagers, rabbits, birds and
// glints stayed drawn in code because they are *too small for generation
// to survive the downsample*. Their villager is 14x22; ours is 18x26,
// and a 16x16 tile is smaller still. Below about thirty pixels the model
// is drawing a picture OF a sprite and the decimation eats it.
//
// So the line is a SIZE, not a principle: big things are generated,
// small things are drawn, and everything lands on the same closed
// palette either way. That is the rule that was actually protecting the
// look all along.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const nur = args.filter((a) => !a.startsWith('--'));

const BATCH = [
  // name     px tall  ramps                                  subject
  ['haus', 100, 'plaster,terracotta,timber,stone,glow',
    'a small half-timbered cottage with a steep terracotta tile roof, '
    + 'cream plaster walls crossed by dark timber framing, one warm lit '
    + 'doorway at the bottom centre and two small warm lit windows, a low '
    + 'stone footing. Cosy, storybook, welcoming'],
  ['baum1', 34, 'leaf,timber,backlit',
    'a single broadleaf tree with a full rounded canopy of layered moss-green '
    + 'foliage and a short sturdy brown trunk, sunlight catching the upper '
    + 'left of the canopy'],
  ['baum2', 34, 'pine,timber,backlit',
    'a single conifer with a tall layered dark-green canopy and a short '
    + 'brown trunk, sunlight catching its upper left'],
  ['baum3', 34, 'leaf,timber,fruit',
    'a single small fruit tree with a rounded moss-green canopy, a short '
    + 'brown trunk and a scattering of small red fruit among the leaves'],
  ['busch', 16, 'leaf,fruit',
    'a small rounded garden bush of dense moss-green leaves'],
  ['stein', 14, 'stone',
    'a single weathered grey boulder sitting on the ground, rounded, with '
    + 'a lit upper-left face and a shaded lower-right one'],
  ['laterne', 34, 'slate,glow,timber',
    'a slender wrought-iron lamp post with a small four-sided glass lantern '
    + 'at the top, glowing warm gold from inside'],
  ['schild', 24, 'timber,plaster',
    'a small wooden signpost: a plank board on a short post, with a simple '
    + 'painted pale arrow on the board pointing to the left. No letters, no '
    + 'writing, no words on the board'],
];

mkdirSync('art_raw', { recursive: true });
mkdirSync('assets/sprites', { recursive: true });

for (const [name, hoch, ramps, subjekt] of BATCH) {
  if (nur.length && !nur.includes(name)) continue;
  const roh = `art_raw/${name}-roh.png`;
  const ziel = `assets/sprites/${name}.png`;
  if (!FORCE && existsSync(ziel)) { console.log(`  ${name} — already there`); continue; }

  if (FORCE || !existsSync(roh)) {
    process.stdout.write(`  ${name}: drawing … `);
    execFileSync('node', ['tools/genkunst.mjs', '--was', 'sprite',
      '--force', '--datei', name, '--subjekt', subjekt], { stdio: 'pipe' });
    console.log('ok');
  }
  process.stdout.write(`  ${name}: pixelising to ${hoch}px … `);
  try {
    execFileSync('node', ['tools/pixelise.mjs', roh, ziel,
      '--height', String(hoch), '--ramps', ramps, '--clean'], { stdio: 'pipe' });
    console.log(ziel);
  } catch (e) {
    // One sprite that will not key must not stop the set. The batch is
    // run to see a whole world at once, and losing the other seven
    // because a signpost came back on a cream card is the wrong trade.
    console.log(`FAILED — ${String(e.stderr ?? e.message).slice(0, 160).trim()}`);
  }
}
