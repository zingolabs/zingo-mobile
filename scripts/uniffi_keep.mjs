// Pure readers of the UniFFI class names a Binding Layer AAR declares and
// a release APK's dex keeps.

import { Buffer } from 'node:buffer';

const DECLARED = /^uniffi\/([^/]+)\/([A-Za-z0-9_]+)(\$[^/]*)?\.class$/;

export function topLevelClasses(entries) {
  const packages = new Map();
  for (const entry of entries) {
    const found = entry.match(DECLARED);
    if (!found) {
      continue;
    }
    const [, pkg, name] = found;
    const names = packages.get(pkg) ?? new Set();
    names.add(name);
    packages.set(pkg, names);
  }
  return new Map([...packages].map(([pkg, names]) => [pkg, [...names].sort()]));
}

export function presentClasses(dex, pkg) {
  const descriptors = new RegExp(
    `Luniffi/${pkg}/([A-Za-z0-9_]+)[$A-Za-z0-9_]*;`,
    'g',
  );
  const text = Buffer.isBuffer(dex) ? dex.toString('latin1') : dex;
  return new Set([...text.matchAll(descriptors)].map(found => found[1]));
}

export function missingClasses(declared, present) {
  return declared.filter(name => !present.has(name));
}

export function aarPath(repositoryRoot, coordinate) {
  const [group, artifact, version] = coordinate.split(':');
  return [
    repositoryRoot,
    ...group.split('.'),
    artifact,
    version,
    `${artifact}-${version}.aar`,
  ].join('/');
}
