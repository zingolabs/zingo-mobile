import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  iosBundleState,
  staleMessage,
} from '../scripts/check_ios_binding_layer.mjs';

const PIN = { digests: { ios: 'sha256:aa' } };

describe('iOS bundle state', () => {
  // Tests that the bundle is held when the marker names the pinned digest and the package manifest is present.
  test('a marker at the pinned digest with a manifest is held', () => {
    expect(iosBundleState(PIN, 'sha256:aa', true)).toEqual({
      kind: 'held',
      digest: 'sha256:aa',
    });
  });

  // Tests that the bundle is stale when the marker names another digest, when no marker exists, and when the manifest is missing.
  test('any other marker or a missing manifest is stale', () => {
    expect(iosBundleState(PIN, 'sha256:bb', true)).toEqual({
      kind: 'stale',
      pinned: 'sha256:aa',
      held: 'sha256:bb',
    });
    expect(iosBundleState(PIN, undefined, true).kind).toBe('stale');
    expect(iosBundleState(PIN, 'sha256:aa', false).kind).toBe('stale');
  });

  // Tests that the stale message names both digests and the fetch command the developer runs.
  test('the stale message names the fetch', () => {
    const message = staleMessage({
      kind: 'stale',
      pinned: 'sha256:aa',
      held: undefined,
    });
    expect(message).toContain('sha256:aa');
    expect(message).toContain(
      'yarn --silent fetch:binding-layer --platform ios',
    );
  });
});

const PROJECT = readFileSync(
  join(__dirname, '..', 'ios', 'Zingo.xcodeproj', 'project.pbxproj'),
  'utf8',
);

function object(id) {
  const start = PROJECT.indexOf(`\n\t\t${id} `) + 1;
  return PROJECT.slice(start, PROJECT.indexOf('\n\t\t};', start));
}

function buildPhases(targetName) {
  const [, id] = PROJECT.match(
    new RegExp(
      `\\n\\t\\t([0-9A-F]{24}) /\\* ${targetName} \\*/ = \\{\\n\\t\\t\\tisa = PBXNativeTarget;`,
    ),
  );
  const [, phases] = object(id).match(
    /buildPhases = \(\n([\s\S]*?)\n\t\t\t\);/,
  );
  return phases.split('\n').map(line => line.trim().slice(0, 24));
}

describe('Zingo target', () => {
  // Tests that the Binding Layer check runs before every other build phase, on every build, and runs no fetch when Xcode builds the Zingo target.
  test('checks the Binding Layer first', () => {
    const [first] = buildPhases('Zingo');
    const phase = object(first);
    expect(phase).toContain('isa = PBXShellScriptBuildPhase;');
    expect(phase).toContain('alwaysOutOfDate = 1;');
    expect(phase).toContain('check_ios_binding_layer.mjs');
    expect(phase).not.toContain('fetch_binding_layer.mjs');
  });
});
