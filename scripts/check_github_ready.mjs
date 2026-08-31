import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
// Read-only: don't stage, commit, push, or change Git configuration.
const git = args => execFileSync('git', args, { encoding: 'utf8', windowsHide: true });
const files = [...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))];
const included = new Set(files);
const manifest = JSON.parse(fs.readFileSync('src/generated/media-manifest.json', 'utf8'));
const required = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'vite.config.ts', 'public/_headers', 'src/generated/media-manifest.json'];
for (const [source, entry] of Object.entries(manifest.entries)) {
  required.push(`public${source}`, ...entry.variants.map(v => `public${v.url}`));
  if (entry.motion) required.push(`public${entry.motion.url}`, `public${entry.motion.poster}`);
}
for (const file of required) assert.ok(included.has(file) && fs.existsSync(file), `Required file missing or ignored: ${file}`);
let largest = { file: '', bytes: 0 };
for (const file of files) {
  assert.ok(!/^(?:node_modules|dist|\.local-backups|scripts\/_vendor|\.wrangler)\//.test(file), `Local-only file would be submitted: ${file}`);
  assert.ok(!/(?:^|\/)\.env(?:\.|$)|\.log$|\.tsbuildinfo$|(?:^|\/)__pycache__\//.test(file), `Local configuration/cache would be submitted: ${file}`);
  if (!fs.existsSync(file)) continue; // An intentional tracked deletion is allowed.
  const bytes = fs.statSync(file).size;
  assert.ok(bytes < 100 * 1024 * 1024, `GitHub file-size limit: ${file}`);
  if (bytes > largest.bytes) largest = { file, bytes };
}
console.log(JSON.stringify({ ready: true, filesIfAllChangesSelected: files.length, requiredMediaAndConfig: required.length, largestFile: largest.file, largestMiB: +(largest.bytes / 1048576).toFixed(2), stagedOrPushedByCheck: false }, null, 2));
