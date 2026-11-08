import type { LoggerEvent } from 'babel-plugin-react-compiler';

type Loc = Extract<LoggerEvent, { kind: 'CompileSkip' }>['loc'];

export type Uncompiled = {
  cause: 'skip' | 'bailout';
  event: 'CompileSkip' | 'CompileError' | 'PipelineError';
  line: number;
  reason: string;
};

export type Outcome =
  | { kind: 'optimized' }
  | { kind: 'diagnostic' }
  | { kind: 'uncompiled'; uncompiled: Uncompiled }
  | { kind: 'ignored' };

export type Tally = { skips: number; bailouts: number };

const lineOf = (loc: Loc): number => loc?.start.line ?? 0;

export function outcomeOf(event: LoggerEvent): Outcome {
  switch (event.kind) {
    case 'CompileSuccess':
      return { kind: 'optimized' };
    case 'CompileDiagnostic':
      return { kind: 'diagnostic' };
    case 'CompileSkip':
      return {
        kind: 'uncompiled',
        uncompiled: {
          cause: 'skip',
          event: event.kind,
          line: lineOf(event.loc),
          reason: event.reason,
        },
      };
    case 'CompileError':
      return {
        kind: 'uncompiled',
        uncompiled: {
          cause: 'bailout',
          event: event.kind,
          line: lineOf(event.fnLoc),
          reason: event.detail.reason,
        },
      };
    case 'PipelineError':
      return {
        kind: 'uncompiled',
        uncompiled: {
          cause: 'bailout',
          event: event.kind,
          line: lineOf(event.fnLoc),
          reason: event.data,
        },
      };
    default:
      return { kind: 'ignored' };
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

export type Transform =
  { kind: 'compiled' } | { kind: 'error'; message: string };

export function failure(thrown: unknown): Transform {
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  return { kind: 'error', message: message.split('\n')[0] };
}

export function fnNameAt(code: string, line: number): string {
  const text = code.split('\n')[line - 1] ?? '';
  for (const pattern of [
    /\bfunction\s+([A-Za-z_$][\w$]*)/,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/,
    /\b([A-Z][\w$]*)\s*[=(]/,
  ]) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return '';
}

export type Scope = { kind: 'changed'; base: string } | { kind: 'all' };
export type Sink = { kind: 'file'; path: string } | { kind: 'stdout' };

export type Options =
  | { kind: 'options'; scope: Scope; json: Sink; strict: boolean }
  | { kind: 'error'; message: string };

const VALUED = { '--base': '<ref>', '--json': '<path>' } as const;

export function parseArgs(args: readonly string[]): Options {
  let scope: Scope = { kind: 'all' };
  let json: Sink = { kind: 'stdout' };
  for (const arg of args) {
    for (const [flag, placeholder] of Object.entries(VALUED)) {
      if (arg !== flag && !arg.startsWith(`${flag}=`)) continue;
      const given = arg.slice(flag.length + 1);
      if (given === '') {
        return {
          kind: 'error',
          message: `${flag} needs a value, as ${flag}=${placeholder}`,
        };
      }
      if (flag === '--base') scope = { kind: 'changed', base: given };
      else json = { kind: 'file', path: given };
    }
  }
  return { kind: 'options', scope, json, strict: args.includes('--strict') };
}

export type Commit = { kind: 'commit'; sha: string } | { kind: 'missing' };

export type Base =
  | { kind: 'base'; ref: string; sha: string }
  | { kind: 'error'; message: string };

export function resolveBase(
  ref: string,
  probe: (rev: string) => Commit,
  remotes: readonly string[],
): Base {
  for (const candidate of [`${ref}@{upstream}`, ref]) {
    const commit = probe(candidate);
    if (commit.kind === 'commit') {
      return { kind: 'base', ref: candidate, sha: commit.sha };
    }
  }
  return {
    kind: 'error',
    message: `unknown base ref ${ref}. The remotes here are: ${remotes.join(', ')}. Pass --base=<ref> for one of them.`,
  };
}

export async function transformEach<T>(
  items: readonly T[],
  transform: (item: T) => Promise<void>,
): Promise<void> {
  for (const item of items) {
    await transform(item);
  }
}
