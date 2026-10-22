import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  // Tests that the Binding Layer fetch runs before every other build phase when Xcode builds the Zingo target.
  test('fetches the Binding Layer first', () => {
    const [first] = buildPhases('Zingo');
    const phase = object(first);
    expect(phase).toContain('isa = PBXShellScriptBuildPhase;');
    expect(phase).toContain('fetch_binding_layer.mjs --platform ios');
  });
});
