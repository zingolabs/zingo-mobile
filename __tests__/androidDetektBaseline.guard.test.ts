/**
 * The detekt baseline holds findings that predate adoption
 * (zingo-mobile#1166) and must shrink as they are fixed, never grow —
 * so an entry naming a Kotlin file that no longer exists is a ghost:
 * it misstates the debt and can never be worked off. This guard pins
 * the baseline to the tree.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const androidApp = join(__dirname, '..', 'android', 'app');

// Every Kotlin file name a baseline ID refers to, deduplicated. IDs have
// the shape `Rule:File.kt$signature`. Pure.
function baselineKotlinFiles(xml: string): string[] {
  const names = [...xml.matchAll(/<ID>[^:<]+:([^$<]+\.kt)\$/g)].map(
    match => match[1],
  );
  return [...new Set(names)].sort();
}

// The base names of every Kotlin source under a directory tree.
function kotlinFilesUnder(dir: string): Set<string> {
  return new Set(
    readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter(path => path.endsWith('.kt'))
      .map(path => path.split('/').pop() as string),
  );
}

it('names only Kotlin files that still exist', () => {
  const baseline = readFileSync(
    join(androidApp, 'detekt-baseline.xml'),
    'utf8',
  );
  const onDisk = kotlinFilesUnder(join(androidApp, 'src'));

  const ghosts = baselineKotlinFiles(baseline).filter(
    file => !onDisk.has(file),
  );

  expect(ghosts).toEqual([]);
});
