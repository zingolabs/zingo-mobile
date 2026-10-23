import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPreActions } from '../scripts/xcscheme.mjs';

const SCHEMES = join('ios', 'Zingo.xcodeproj', 'xcshareddata', 'xcschemes');

describe('scheme pre-actions', () => {
  // Tests that a build pre-action is read with its title and its unescaped script when the scheme declares one.
  test('a build pre-action is read', () => {
    const xml =
      '<Scheme><BuildAction><PreActions><ExecutionAction>' +
      '<ActionContent title = "Fetch" scriptText = "echo &quot;a&quot; &amp;&amp; b&#10;">' +
      '</ActionContent></ExecutionAction></PreActions></BuildAction></Scheme>';
    expect(buildPreActions(xml)).toEqual([
      { title: 'Fetch', script: 'echo "a" && b\n' },
    ]);
  });

  // Tests that no pre-action is read when the build action declares none.
  test('a scheme without pre-actions reads empty', () => {
    expect(
      buildPreActions('<Scheme><BuildAction></BuildAction></Scheme>'),
    ).toEqual([]);
  });
});

describe.each(['Zingo', 'Zingo Beta'])('the %s scheme', name => {
  // Tests that the scheme fetches the iOS Binding Layer in a build pre-action, before Xcode plans the package build.
  test('fetches the Binding Layer before the build', () => {
    const xml = readFileSync(
      join(__dirname, '..', SCHEMES, `${name}.xcscheme`),
      'utf8',
    );
    const scripts = buildPreActions(xml).map(({ script }) => script);
    expect(
      scripts.some(script =>
        script.includes('fetch_binding_layer.mjs --platform ios'),
      ),
    ).toBe(true);
  });
});
