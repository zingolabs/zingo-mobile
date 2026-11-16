import path from 'node:path';
import { transformSync } from '@babel/core';
import type { LoggerEvent } from 'babel-plugin-react-compiler';
import reactCompiler from '../babel.react-compiler';

const [name, options] = reactCompiler;

const compile = (code: string): string[] => {
  const kinds: string[] = [];
  transformSync(code, {
    filename: path.join(__dirname, '..', 'app', 'Probe.tsx'),
    babelrc: false,
    configFile: false,
    plugins: [
      [
        name,
        {
          ...options,
          logger: {
            logEvent: (_file: string, event: LoggerEvent) =>
              kinds.push(event.kind),
          },
        },
      ],
    ],
  });
  return kinds;
};

describe('the shared compiler entry', () => {
  // Tests that the stock opt-out directives apply when the entry sets no custom set, which a custom set would replace.
  test('the entry keeps the stock opt-out directives', () => {
    expect(Object.keys(options)).not.toContain('customOptOutDirectives');
  });

  // Tests that a component is compiled when its worklet directive sits on an inner arrow, and skipped when an opt-out directive sits on its own body. The compiler reads directives on the body it compiles alone.
  test('an inner worklet directive is compiled and a body opt-out is skipped', () => {
    expect(
      compile(
        [
          'function Pulse() {',
          "  const style = useAnimatedStyle(() => { 'worklet'; return {}; });",
          '  return style;',
          '}',
        ].join('\n'),
      ),
    ).toContain('CompileSuccess');
    expect(
      compile(
        [
          'function Still() {',
          "  'use no memo';",
          '  const style = useAnimatedStyle(() => ({}));',
          '  return style;',
          '}',
        ].join('\n'),
      ),
    ).toContain('CompileSkip');
  });
});
