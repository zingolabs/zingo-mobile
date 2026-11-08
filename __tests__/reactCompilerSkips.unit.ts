import {
  CompilerErrorDetail,
  ErrorCategory,
  type LoggerEvent,
} from 'babel-plugin-react-compiler';
import {
  failure,
  fnNameAt,
  gateFails,
  outcomeOf,
  parseArgs,
  regressions,
  resolveBase,
  tally,
  type Commit,
  type Uncompiled,
} from '../scripts/react_compiler_skips';

type Loc = NonNullable<Extract<LoggerEvent, { kind: 'CompileSkip' }>['loc']>;

const at = (line: number): Loc => ({
  start: { line, column: 0, index: 0 },
  end: { line, column: 0, index: 0 },
  filename: 'app/Probe.tsx',
  identifierName: '',
});

describe('compiler event outcome', () => {
  // Tests that a CompileSkip becomes a skip when the compiler honors an opt-out directive.
  test('a CompileSkip is a skip carrying the opt-out directive', () => {
    expect(
      outcomeOf({
        kind: 'CompileSkip',
        fnLoc: at(10),
        loc: at(12),
        reason: "Skipped due to 'use no memo' directive.",
      }),
    ).toEqual({
      kind: 'uncompiled',
      uncompiled: {
        cause: 'skip',
        event: 'CompileSkip',
        line: 12,
        reason: "Skipped due to 'use no memo' directive.",
      },
    });
  });

  // Tests that a CompileError becomes a bailout when the compiler rejects a function, carrying the detail reason.
  test('a CompileError is a bailout carrying the detail reason', () => {
    expect(
      outcomeOf({
        kind: 'CompileError',
        fnLoc: at(40),
        detail: new CompilerErrorDetail({
          category: ErrorCategory.Refs,
          reason: 'Cannot access refs during render',
          loc: at(41),
        }),
      }),
    ).toEqual({
      kind: 'uncompiled',
      uncompiled: {
        cause: 'bailout',
        event: 'CompileError',
        line: 40,
        reason: 'Cannot access refs during render',
      },
    });
  });

  // Tests that a PipelineError becomes a bailout when the compiler fails internally, carrying its data.
  test('a PipelineError is a bailout carrying its data', () => {
    expect(
      outcomeOf({
        kind: 'PipelineError',
        fnLoc: at(7),
        data: 'Unexpected terminal kind',
      }),
    ).toEqual({
      kind: 'uncompiled',
      uncompiled: {
        cause: 'bailout',
        event: 'PipelineError',
        line: 7,
        reason: 'Unexpected terminal kind',
      },
    });
  });

  // Tests that a success, a diagnostic and an auto-deps event each take their own outcome when the compiler reports them.
  test('a success, a diagnostic and an auto-deps event have their own outcomes', () => {
    expect(
      outcomeOf({
        kind: 'CompileSuccess',
        fnLoc: at(1),
        fnName: 'History',
        memoSlots: 3,
        memoBlocks: 1,
        memoValues: 2,
        prunedMemoBlocks: 0,
        prunedMemoValues: 0,
      }),
    ).toEqual({ kind: 'optimized' });
    expect(
      outcomeOf({
        kind: 'CompileDiagnostic',
        fnLoc: at(1),
        detail: {
          category: ErrorCategory.Hooks,
          reason: 'Hooks must be called at the top level',
          loc: at(2),
        },
      }),
    ).toEqual({ kind: 'diagnostic' });
    expect(
      outcomeOf({ kind: 'AutoDepsEligible', fnLoc: at(1), depArrayLoc: at(2) }),
    ).toEqual({ kind: 'ignored' });
  });
});

describe('tally and gate', () => {
  const skip: Uncompiled = {
    cause: 'skip',
    event: 'CompileSkip',
    line: 1,
    reason: "Skipped due to 'worklet' directive.",
  };
  const bailout: Uncompiled = {
    cause: 'bailout',
    event: 'CompileError',
    line: 2,
    reason:
      'Mutating a value returned from a function whose return value should not be mutated',
  };

  // Tests that the tally counts skips and bailouts apart when both occur.
  test('skips and bailouts are counted apart', () => {
    expect(tally([skip, bailout, bailout])).toEqual({
      skips: 1,
      bailouts: 2,
    });
  });

  // Tests that the gate fails on a bailout and passes when only skips remain. A transform error fails the gate regardless of gating.
  test('the gate fails on bailouts and transform errors only', () => {
    expect(gateFails({ gated: true, bailouts: 1, errors: 0 })).toBe(true);
    expect(gateFails({ gated: true, bailouts: 0, errors: 0 })).toBe(false);
    expect(gateFails({ gated: false, bailouts: 3, errors: 0 })).toBe(false);
    expect(gateFails({ gated: false, bailouts: 0, errors: 1 })).toBe(true);
  });
});

describe('ratchet against the base', () => {
  // Tests that a changed file regresses when its bailout count on HEAD exceeds its count on the base.
  test('a file whose bailouts grow is a regression', () => {
    expect(
      regressions(
        { 'screens/Send/Send.tsx': 3 },
        { 'screens/Send/Send.tsx': 4 },
      ),
    ).toEqual([{ file: 'screens/Send/Send.tsx', base: 3, head: 4 }]);
  });

  // Tests that a changed file passes when its bailout count is unchanged or falls. A one-line copy fix in a file with three existing bailouts stays green.
  test('a file whose bailouts hold or fall is no regression', () => {
    expect(
      regressions(
        { 'screens/Send/Send.tsx': 3, 'screens/History/History.tsx': 2 },
        { 'screens/Send/Send.tsx': 3, 'screens/History/History.tsx': 1 },
      ),
    ).toEqual([]);
  });

  // Tests that a file new on the branch counts from zero when the base lacks it.
  test('a new file counts from zero', () => {
    expect(regressions({}, { 'ui/widgets/New.tsx': 1 })).toEqual([
      { file: 'ui/widgets/New.tsx', base: 0, head: 1 },
    ]);
    expect(regressions({}, { 'ui/widgets/Clean.tsx': 0 })).toEqual([]);
  });
});

describe('function name at a line', () => {
  const code = [
    'function History() {}',
    'const useShallowMemo = () => {};',
    '  PairCards(props) {',
    'return <Text />;',
  ].join('\n');

  // Tests that the lookup names the declaration, the binding or the capitalized call on the reported line, and yields the empty name when the line has none.
  test('a declaration, a binding and a capitalized call are named', () => {
    expect(fnNameAt(code, 1)).toBe('History');
    expect(fnNameAt(code, 2)).toBe('useShallowMemo');
    expect(fnNameAt(code, 3)).toBe('PairCards');
    expect(fnNameAt(code, 4)).toBe('');
    expect(fnNameAt(code, 0)).toBe('');
  });
});

describe('transform failure', () => {
  // Tests that a thrown Error is reported by the first line of its message, and a thrown non-Error by its string form.
  test('an Error gives its first message line and a non-Error its string', () => {
    expect(failure(new Error('Unexpected token\n  at parse'))).toEqual({
      kind: 'error',
      message: 'Unexpected token',
    });
    expect(failure('boom')).toEqual({ kind: 'error', message: 'boom' });
  });
});

describe('command line', () => {
  // Tests that the options parse when each flag carries its value, and that the last --base wins when the script default and the CLI both give one.
  test('values parse and the last --base wins', () => {
    expect(
      parseArgs([
        '--base=origin/dev',
        '--json=out.json',
        '--strict',
        '--base=abc123',
      ]),
    ).toEqual({
      kind: 'options',
      scope: { kind: 'changed', base: 'abc123' },
      json: { kind: 'file', path: 'out.json' },
      strict: true,
    });
    expect(parseArgs([])).toEqual({
      kind: 'options',
      scope: { kind: 'all' },
      json: { kind: 'stdout' },
      strict: false,
    });
  });

  // Tests that a --base with no value is rejected when it would otherwise turn the gate into an ungated full sweep. An empty value counts as missing.
  test('a bare or empty --base is rejected', () => {
    expect(parseArgs(['--base'])).toEqual({
      kind: 'error',
      message: '--base needs a value, as --base=<ref>',
    });
    expect(parseArgs(['--base='])).toEqual({
      kind: 'error',
      message: '--base needs a value, as --base=<ref>',
    });
    expect(parseArgs(['--json'])).toEqual({
      kind: 'error',
      message: '--json needs a value, as --json=<path>',
    });
  });
});

describe('base ref resolution', () => {
  const shas: Record<string, string> = {
    'dev@{upstream}': 'aaa111',
    dev: 'bbb222',
    'origin/dev': 'ccc333',
  };
  const probe = (rev: string): Commit =>
    rev in shas ? { kind: 'commit', sha: shas[rev] } : { kind: 'missing' };
  const nothing = (): Commit => ({ kind: 'missing' });

  // Tests that a branch resolves to its upstream when one is configured, whatever the remote is named, and to itself otherwise.
  test('a branch prefers its upstream and falls back to itself', () => {
    expect(resolveBase('dev', probe, ['zingolabs'])).toEqual({
      kind: 'base',
      ref: 'dev@{upstream}',
      sha: 'aaa111',
    });
    expect(resolveBase('origin/dev', probe, ['origin'])).toEqual({
      kind: 'base',
      ref: 'origin/dev',
      sha: 'ccc333',
    });
  });

  // Tests that an unknown ref is an error naming the ref and the remotes when no candidate resolves.
  test('an unknown ref names itself and the remotes', () => {
    expect(resolveBase('origin/dev', nothing, ['zingolabs'])).toEqual({
      kind: 'error',
      message:
        'unknown base ref origin/dev. The remotes here are: zingolabs. Pass --base=<ref> for one of them.',
    });
  });
});
