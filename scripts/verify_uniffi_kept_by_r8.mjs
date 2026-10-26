#!/usr/bin/env node
// Verifies that R8 kept every top-level UniFFI class of the pinned Binding
// Layer AAR in each release APK. Release APKs are minified and every test
// lane builds debug, which leaves a missing -keep rule invisible until a
// published APK runs. Reads the AAR the fetch placed and the dex files of
// each APK with unzip.
//
// Usage: node scripts/verify_uniffi_kept_by_r8.mjs <apk> [<apk> ...]

import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aarPath,
  missingClasses,
  presentClasses,
  topLevelClasses,
} from './uniffi_keep.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apks = process.argv.slice(2);
if (apks.length === 0) {
  console.error('usage: verify_uniffi_kept_by_r8.mjs <apk> [<apk> ...]');
  process.exit(2);
}

function run(command, args) {
  const ran = spawnSync(command, args);
  if (ran.status !== 0) {
    process.stderr.write(ran.stderr);
    process.exit(ran.status ?? 1);
  }
  return ran.stdout;
}

const [repository, coordinate] = run(process.execPath, [
  join(ROOT, 'scripts', 'fetch_binding_layer.mjs'),
  '--platform',
  'android',
])
  .toString()
  .trim()
  .split('\n');
const workdir = mkdtempSync(join(tmpdir(), 'uniffi-keep-'));
const classesJar = join(workdir, 'classes.jar');
writeFileSync(
  classesJar,
  run('unzip', ['-p', aarPath(repository, coordinate), 'classes.jar']),
);
const declared = topLevelClasses(
  run('unzip', ['-Z1', classesJar]).toString().split('\n'),
);

let failed = false;
for (const apk of apks) {
  const dexDir = join(workdir, `${basename(apk)}.dex`);
  run('unzip', ['-o', '-q', apk, 'classes*.dex', '-d', dexDir]);
  const dex = readdirSync(dexDir).map(file => readFileSync(join(dexDir, file)));
  for (const [pkg, names] of declared) {
    const present = new Set(
      dex.flatMap(buffer => [...presentClasses(buffer, pkg)]),
    );
    const missing = missingClasses(names, present);
    if (missing.length > 0) {
      failed = true;
      console.error(`R8 stripped uniffi.${pkg} classes from ${basename(apk)}:`);
      missing.forEach(name => console.error(`  - ${name}`));
      console.error(
        `  add a -keep rule covering uniffi.${pkg} to android/app/proguard-rules.pro`,
      );
    } else {
      console.log(
        `ok: ${basename(apk)} keeps all ${names.length} uniffi.${pkg} classes`,
      );
    }
  }
}
rmSync(workdir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
