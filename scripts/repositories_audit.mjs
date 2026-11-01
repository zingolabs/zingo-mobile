#!/usr/bin/env node
// Audits the repositories of the Android build. Fails when a tracked file
// names the snapshot host, or when any project still resolves through a
// snapshot repository once Gradle has evaluated every project.
//
// Usage: node scripts/repositories_audit.mjs

import { spawnSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';

export const FORBIDDEN_TERMS = ['sonatype'];

// The audit and its test name the terms they forbid.
export const AUDIT_FILES = [
  'scripts/repositories_audit.mjs',
  '__tests__/repositoriesAudit.unit.test.js',
];

export function termHits(grepLines, terms) {
  const lowered = terms.map(term => term.toLowerCase());
  return grepLines.filter(line => {
    const content = line.split(':').slice(2).join(':').toLowerCase();
    return lowered.some(term => content.includes(term));
  });
}

// A snapshot repository is remote, and its path names snapshots. A local
// repository under any directory is a release repository whatever its path.
export function isSnapshotRepository(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    parsed.pathname.toLowerCase().includes('snapshot')
  );
}

export function snapshotRepositories(listing) {
  return listing
    .split('\n')
    .filter(line => line.startsWith('repository '))
    .filter(line => isSnapshotRepository(line.split(' ')[2] ?? ''));
}

if (basename(process.argv[1] ?? '') === 'repositories_audit.mjs') {
  const scriptsDir = dirname(process.argv[1]);
  const repoDir = resolve(scriptsDir, '..');
  const androidDir = join(repoDir, 'android');
  const initScript = join(scriptsDir, 'repositories_audit.init.gradle.kts');

  const scan = spawnSync(
    'git',
    [
      'grep',
      '--ignore-case',
      '--line-number',
      ...FORBIDDEN_TERMS.flatMap(term => ['-e', term]),
      '--',
      '.',
      ...AUDIT_FILES.map(file => `:(exclude)${file}`),
    ],
    { cwd: repoDir, encoding: 'utf8' },
  );
  if (scan.status !== 0 && scan.status !== 1) {
    process.stderr.write(scan.stderr);
    process.exit(scan.status ?? 1);
  }
  const hits = termHits(
    scan.stdout.split('\n').filter(Boolean),
    FORBIDDEN_TERMS,
  );
  if (hits.length > 0) {
    console.error('Tracked files name the snapshot host:');
    for (const hit of hits) {
      console.error(`  ${hit}`);
    }
    process.exit(1);
  }

  const gradle = spawnSync(
    join(androidDir, 'gradlew'),
    ['--no-daemon', '--quiet', '--init-script', initScript, ':app:help'],
    { cwd: androidDir, encoding: 'utf8' },
  );
  if (gradle.status !== 0) {
    process.stderr.write(gradle.stderr);
    process.exit(gradle.status ?? 1);
  }
  const snapshots = snapshotRepositories(gradle.stdout);
  if (snapshots.length > 0) {
    console.error('Projects resolve through a snapshot repository:');
    for (const repository of snapshots) {
      console.error(`  ${repository}`);
    }
    process.exit(1);
  }
  console.log(
    'No tracked file names the snapshot host, and no project resolves through a snapshot repository.',
  );
}
