// Generate every spoken line with ElevenLabs, at BUILD time.
//
//   node tools/genvoice.mjs             # everything that is missing
//   node tools/genvoice.mjs --force     # everything, again
//   node tools/genvoice.mjs --samples   # one line in each candidate voice
//   node tools/genvoice.mjs --voice ID  # use a different voice
//
// Key: ELEVENLABS_API_KEY, or c:/development/fallennights2d/.env.
//
// WHY THIS IS A BUILD STEP AND NOT A RUNTIME CALL
//
// AGENTS.md rule 9: nothing leaves the device. No network calls, no
// analytics, not even an error reporter. A learning game for a
// six-year-old that phones an American speech API every time it opens a
// door would break that rule for every child in the class, and it would
// stop working on a train.
//
// So ElevenLabs is a tool in the toolchain, like esbuild. It runs on
// this machine, writes MP3 files into `assets/voice/`, and the running
// app has never heard of it. `tools/verify.mjs` checks every request's
// origin, so this is a fact rather than an intention.
//
// The lines come from `src/core/i18n.ts` and from nowhere else, so a
// line that is not in the string table cannot be spoken — which is the
// same rule the app enforces from the other side.
//
// Lifted from LernInseln and cut down: that project also had a word
// list, a syllable list and the numerals to speak. Funkelwelt speaks
// only Luma's lines so far, and the rest come across when the houses
// that need them do.

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const FFMPEG = 'ffmpeg';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const SAMPLES = args.includes('--samples');
const VOICE_ARG = args.includes('--voice') ? args[args.indexOf('--voice') + 1] : null;

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const env = readFileSync('c:/development/fallennights2d/.env', 'utf8').trim();
  const m = env.match(/sk_[a-z0-9]+/i);
  if (!m) throw new Error('no ElevenLabs key found');
  return m[0];
}

/**
 * Candidate voices, for `--samples`.
 *
 * The brief is a nice soft woman's voice for a first-grader, in German.
 * `eleven_multilingual_v2` will speak German in any of these, but how
 * much English accent leaks through varies a lot between them and is
 * not something that can be decided by reading a label — so this renders
 * the same sentence in each and the choice is made by ear.
 */
const CANDIDATES = {
  matilda: 'XrExE9yKIg1WjnnlVkGX',
  sarah: 'EXAVITQu4vr4xnSDxMaL',
  lily: 'pFZP5JQG7iQjIQuC4Bku',
  alice: 'Xb7hH8MSUJpSbSDYk0k2',
  dorothy: 'ThT5KcBeYPX3keUQqHPh',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
};

/**
 * The voice the app ships with.
 *
 * The same one LernInseln settled on after listening to all six. Luma
 * is a different character from that app's narrator, but she is being
 * heard by the same child in the same room, and two learning games on
 * one home screen speaking in two different women's voices is the kind
 * of seam nobody notices deliberately and everybody notices.
 */
const VOICE = VOICE_ARG ?? CANDIDATES.matilda;

const MODEL = 'eleven_multilingual_v2';

/**
 * Settings tuned for a six-year-old listener rather than for an
 * audiobook: high enough stability that the same sentence sounds the
 * same every time it is heard (and it will be heard a hundred times),
 * moderate similarity so it stays warm, and only a touch of style —
 * past about 0.3 the model starts performing, and a grown-up being
 * funny AT a six-year-old is worse than one reading plainly to her.
 */
const SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.80,
  style: 0.18,
  use_speaker_boost: true,
};

// ------------------------------------------------------- what to speak

function spokenLines() {
  const src = readFileSync('src/core/i18n.ts', 'utf8');
  const out = {};
  // The table is a plain object literal of 'key': 'value' pairs. A
  // regex is enough and means this script does not need a bundler.
  const re = /'(say\.[A-Za-z0-9]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(src))) {
    const stem = m[1].replace(/\./g, '-').toLowerCase();
    out[stem] = m[2].replace(/\\'/g, "'");
  }
  return out;
}

async function tts(text, voice, path) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey(), 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS }),
    });
  if (!res.ok) {
    throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

/**
 * Shrink and tidy a take.
 *
 * The generator hands back 128kbps stereo at 44.1kHz, of which roughly a
 * third is silence. This app caches ALL of itself on install so that it
 * works on a train, which makes every one of those kilobytes part of
 * the first launch on a school iPad.
 *
 * So: mono (it is one voice, and an iPad speaker is mono anyway),
 * 64kbps (speech, not music), and the silence trimmed off both ends so
 * that a line answers a tap immediately instead of a beat later. That
 * last one is the part a child would actually notice.
 *
 * `loudnorm` is deliberately NOT used: it is a two-pass measurement and
 * on takes this short it pumps. A fixed, gentle gain keeps every line at
 * the same level, which is what "einheitlich" was asking for.
 */
function shrink(path) {
  const tmp = `${path}.tmp.mp3`;
  try {
    execFileSync(FFMPEG, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', path,
      '-af', [
        'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB',
        // trailing silence, by reversing, trimming and reversing back —
        // ffmpeg has no "stop_silence" that behaves on short files
        'areverse',
        'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB',
        'areverse',
        // a breath of room at the end, so the tail is not clipped
        'apad=pad_dur=0.12',
        'volume=1.15',
      ].join(','),
      '-ac', '1', '-ar', '44100', '-b:a', '64k',
      tmp,
    ], { stdio: 'pipe' });
    renameSync(tmp, path);
  } catch (e) {
    // No ffmpeg, or a take it cannot handle. The unprocessed file is
    // still perfectly playable, so this must never be fatal.
    if (existsSync(tmp)) unlinkSync(tmp);
    if (!shrink.warned) {
      console.log(`  (not shrinking: ${String(e.message).split('\n')[0]})`);
      shrink.warned = true;
    }
  }
}

/**
 * The words, for the language houses.
 *
 * A single word read in isolation comes out clipped, because the model
 * reads it as a list item. A full stop after it gives it a sentence to
 * land, and the beat of quiet that leaves is exactly what a listening
 * exercise wants anyway.
 */
function woerter() {
  const src = readFileSync('src/games/woerter.ts', 'utf8');
  const out = {};
  for (const m of src.matchAll(/\{\s*wort:\s*'([^']+)'/g)) {
    const stem = 'wort-' + m[1].toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    out[stem] = `${m[1]}.`;
  }
  return out;
}

// ------------------------------------------------------------------ go

if (SAMPLES) {
  mkdirSync('audio_raw', { recursive: true });
  const line = 'Da bist du ja. Ich bin Luma. '
    + 'Die Welt ist dunkel geworden, und du bist die Erste seit langem, '
    + 'die eine Laterne traegt.';
  for (const [name, id] of Object.entries(CANDIDATES)) {
    const path = `audio_raw/sample-${name}.mp3`;
    process.stdout.write(`  ${name} … `);
    try {
      await tts(line, id, path);
      console.log(path);
    } catch (e) {
      console.log(`FAILED ${e.message}`);
    }
  }
  console.log('\nListen to audio_raw/sample-*.mp3 and pick one, then:');
  console.log('  node tools/genvoice.mjs --voice <id> --force');
  process.exit(0);
}

mkdirSync('assets/voice', { recursive: true });

const alle = { ...spokenLines(), ...woerter() };
const stems = Object.keys(alle).sort();
console.log(`  ${stems.length} lines from src/core/i18n.ts and src/games/woerter.ts`);

let gemacht = 0, uebersprungen = 0, kaputt = 0;
for (const stem of stems) {
  const path = `assets/voice/${stem}.mp3`;
  if (!FORCE && existsSync(path)) { uebersprungen++; continue; }
  process.stdout.write(`  ${stem} … `);
  try {
    await tts(alle[stem], VOICE, path);
    shrink(path);
    gemacht++;
    console.log('ok');
  } catch (e) {
    kaputt++;
    console.log(`FAILED ${e.message}`);
  }
}
console.log(`\n  ${gemacht} written, ${uebersprungen} already there, ${kaputt} failed`);
if (kaputt) process.exit(1);
