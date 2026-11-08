import {
  failure,
  fnNameAt,
  gateFails,
  regressions,
  uncompiledFrom,
  tally,
  type Uncompiled,
} from '../scripts/react_compiler_skips';

describe('skip classification', () => {
  // Tests that a CompileSkip becomes a skip when the compiler honors an opt-out directive.
  test('a CompileSkip is a skip carrying the opt-out directive', () => {
    expect(
      uncompiledFrom({
        kind: 'CompileSkip',
        loc: { start: { line: 12 } },
        reason: 'Skipped due to "use no memo" directive.',
      }),
    ).toEqual({
      cause: 'skip',
      event: 'CompileSkip',
      line: 12,
      reason: 'Skipped due to "use no memo" directive.',
    });
  });

  // Tests that a CompileError becomes a bailout when the compiler rejects a function, carrying the detail reason.
  test('a CompileError is a bailout carrying the detail reason', () => {
    expect(
      uncompiledFrom({
        kind: 'CompileError',
        fnLoc: { start: { line: 40 } },
        detail: {
          reason:
            'Ref values (the `current` property) may not be accessed during render',
        },
      }),
    ).toEqual({
      cause: 'bailout',
      event: 'CompileError',
      line: 40,
      reason:
        'Ref values (the `current` property) may not be accessed during render',
    });
  });

  // Tests that a bailout without a detail reason carries the serialized detail when the compiler omits the reason.
  test('a CompileError without a reason carries the serialized detail', () => {
    expect(
      uncompiledFrom({
        kind: 'CompileError',
        fnLoc: null,
        detail: { severity: 'Todo' },
      }),
    ).toEqual({
      cause: 'bailout',
      event: 'CompileError',
      line: 0,
      reason: '{"severity":"Todo"}',
    });
  });

  // Tests that a PipelineError becomes a bailout when the compiler fails internally, carrying its data.
  test('a PipelineError is a bailout carrying its data', () => {
    expect(
      uncompiledFrom({
        kind: 'PipelineError',
        fnLoc: { start: { line: 7 } },
        data: 'Unexpected terminal kind',
      }),
    ).toEqual({
      cause: 'bailout',
      event: 'PipelineError',
      line: 7,
      reason: 'Unexpected terminal kind',
    });
  });

  // Tests that neither class arises when the compiler reports a success or a diagnostic.
  test('a success and a diagnostic yield neither', () => {
    expect(uncompiledFrom({ kind: 'CompileSuccess' })).toBeUndefined();
    expect(uncompiledFrom({ kind: 'CompileDiagnostic' })).toBeUndefined();
  });
});

describe('tally and gate', () => {
  const skip: Uncompiled = {
    cause: 'skip',
    event: 'CompileSkip',
    line: 1,
    reason: 'Skipped due to "worklet" directive.',
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

  // Tests that the lookup names the declaration, the binding or the capitalized call on the reported line, and yields no name when the line has none.
  test('a declaration, a binding and a capitalized call are named', () => {
    expect(fnNameAt(code, 1)).toBe('History');
    expect(fnNameAt(code, 2)).toBe('useShallowMemo');
    expect(fnNameAt(code, 3)).toBe('PairCards');
    expect(fnNameAt(code, 4)).toBeUndefined();
    expect(fnNameAt(code, 0)).toBeUndefined();
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
