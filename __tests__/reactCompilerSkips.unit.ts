import {
  gateFails,
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
