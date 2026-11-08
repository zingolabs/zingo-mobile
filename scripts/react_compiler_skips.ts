export type CompilerEvent =
  | { kind: 'CompileSuccess' }
  | { kind: 'CompileSkip'; loc: unknown; reason: string }
  | {
      kind: 'CompileError';
      fnLoc: unknown;
      detail?: { reason?: string; [extra: string]: unknown };
    }
  | { kind: 'PipelineError'; fnLoc: unknown; data: string }
  | { kind: 'CompileDiagnostic' };

export type Uncompiled = {
  cause: 'skip' | 'bailout';
  event: 'CompileSkip' | 'CompileError' | 'PipelineError';
  line: number;
  reason: string;
};

export type Tally = { skips: number; bailouts: number };

function lineOf(loc: unknown): number {
  if (typeof loc !== 'object' || loc === null || !('start' in loc)) return 0;
  const { start } = loc;
  if (typeof start !== 'object' || start === null || !('line' in start))
    return 0;
  return typeof start.line === 'number' ? start.line : 0;
}

export function uncompiledFrom(event: CompilerEvent): Uncompiled | undefined {
  switch (event.kind) {
    case 'CompileSkip':
      return {
        cause: 'skip',
        event: event.kind,
        line: lineOf(event.loc),
        reason: event.reason,
      };
    case 'CompileError':
      return {
        cause: 'bailout',
        event: event.kind,
        line: lineOf(event.fnLoc),
        reason: event.detail?.reason ?? JSON.stringify(event.detail),
      };
    case 'PipelineError':
      return {
        cause: 'bailout',
        event: event.kind,
        line: lineOf(event.fnLoc),
        reason: event.data,
      };
    default:
      return undefined;
  }
}

export function tally(list: readonly Uncompiled[]): Tally {
  return {
    skips: list.filter(u => u.cause === 'skip').length,
    bailouts: list.filter(u => u.cause === 'bailout').length,
  };
}

export function gateFails({
  gated,
  bailouts,
  errors,
}: {
  gated: boolean;
  bailouts: number;
  errors: number;
}): boolean {
  return errors > 0 || (gated && bailouts > 0);
}

export type Regression = { file: string; base: number; head: number };

export function regressions(
  base: Readonly<Record<string, number>>,
  head: Readonly<Record<string, number>>,
): Regression[] {
  return Object.entries(head)
    .map(([file, count]) => ({ file, base: base[file] ?? 0, head: count }))
    .filter(r => r.head > r.base);
}
