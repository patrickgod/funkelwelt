// Assembles DEVLOG.md from the entries in devlog/.
//
//   node tools/devlog.mjs
//
// DEVLOG-STYLE.md: "DEVLOG.md in the repo holds the same content as
// plain text, so it survives independently of any hosting." Written as
// a tool rather than kept by hand for the obvious reason — two copies
// of the same prose maintained by hand are one copy and one lie.
//
// Image paths are rewritten to point into the entry's own folder, so
// the assembled file renders correctly on GitHub.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';

const HEAD = `# Devlog

The diary of this project and the one before it. One story, appended to,
rather than a pile of numbered posts.

The illustrated version is published separately; this file is the same
text, in the repo, so it outlives any hosting. **Do not edit it by
hand** — it is assembled from \`devlog/*/article.md\` by
\`node tools/devlog.mjs\`.

`;

const entries = readdirSync('devlog')
  .filter((d) => statSync(`devlog/${d}`).isDirectory())
  .sort();

let out = HEAD;
for (const dir of entries) {
  const body = readFileSync(`devlog/${dir}/article.md`, 'utf8')
    .replace(/!\[([^\]]*)\]\((?!https?:)([^)]+)\)/g, `![$1](devlog/${dir}/$2)`);
  out += `\n---\n\n${body.trim()}\n`;
}

writeFileSync('DEVLOG.md', out);
console.log(`  DEVLOG.md — ${entries.length} entries, ${out.length} characters`);
