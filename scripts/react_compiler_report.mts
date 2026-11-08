#!/usr/bin/env tsx
// React Compiler healthcheck over app/ui/screens. Reports which components
// and hooks the compiler optimizes and which it skips. With --base=<ref>,
// checks only files changed against that ref and exits non-zero when any of
// them is skipped.
//
// The compiler options are read from babel.config.js.
//
// Usage:
//   tsx scripts/react_compiler_report.mts                     full report
//   tsx scripts/react_compiler_report.mts --base=origin/dev   changed files
//   tsx scripts/react_compiler_report.mts --strict            fail on any skip
//   tsx scripts/react_compiler_report.mts --json=out.json     also write JSON

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type SourceLocation = { start?: { line?: number } } | null;

type CompilerEvent =
  | { kind: 'CompileSuccess' }
  | { kind: 'CompileSkip'; loc: SourceLocation; reason: string }
  | {
      kind: 'CompileError';
      fnLoc: SourceLocation;
      detail?: { reason?: string };
    }
  | { kind: 'PipelineError'; fnLoc: SourceLocation; data: string }
  | { kind: 'CompileDiagnostic' };

type CompilerOptions = {
  sources: (filename: string | null | undefined) => boolean;
};

type BabelConfig = { presets: unknown[]; plugins: unknown[] };

type Babel = {
  transformAsync(
    code: string,
    options: Record<string, unknown>,
  ): Promise<unknown>;
};

type Skip = { line: number; name: string | null; kind: string; reason: string };

type FileReport = {
  file: string;
  code: string;
  lines: string[] | null;
  optimized: number;
  skipped: Skip[];
  diagnostics: number;
  error: string | null;
};

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const entry = args.find(a => a === name || a.startsWith(`${name}=`));
  if (entry === undefined) return undefined;
  const eq = entry.indexOf('=');
  return eq === -1 ? '' : entry.slice(eq + 1);
};
const baseRef = argValue('--base') || undefined;
const jsonPath = argValue('--json') || undefined;
const strict = args.includes('--strict');

const babel: Babel = require_('@babel/core');
const babelConfig: BabelConfig = require_(path.join(ROOT, 'babel.config.js'));

const compilerEntry = babelConfig.plugins.find(
  (plugin): plugin is [string, CompilerOptions] =>
    Array.isArray(plugin) && plugin[0] === 'babel-plugin-react-compiler',
);
if (compilerEntry === undefined) {
  console.error('babel.config.js has no babel-plugin-react-compiler entry');
  process.exit(2);
}
const { sources } = compilerEntry[1];

const reports = new Map<string, FileReport>();

function fileReport(file: string): FileReport {
  let report = reports.get(file);
  if (report === undefined) {
    report = {
      file,
      code: readFileSync(file, 'utf8'),
      lines: null,
      optimized: 0,
      skipped: [],
      diagnostics: 0,
      error: null,
    };
    reports.set(file, report);
  }
  return report;
}

function fnNameAt(lines: string[], line: number): string | null {
  const text = lines[line - 1] ?? '';
  for (const pattern of [
    /\bfunction\s+([A-Za-z_$][\w$]*)/,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/,
    /\b([A-Z][\w$]*)\s*[=(]/,
  ]) {
    const match = text.match(pattern);
    if (match) return match[1] ?? null;
  }
  return null;
}

const logger = {
  logEvent(filename: string | null, event: CompilerEvent): void {
    if (typeof filename !== 'string' || !sources(filename)) return;
    const report = fileReport(filename);
    if (event.kind === 'CompileSuccess') {
      report.optimized += 1;
    } else if (
      event.kind === 'CompileError' ||
      event.kind === 'CompileSkip' ||
      event.kind === 'PipelineError'
    ) {
      const loc = event.kind === 'CompileSkip' ? event.loc : event.fnLoc;
      const line = loc?.start?.line ?? 0;
      const reason =
        event.kind === 'CompileSkip'
          ? event.reason
          : event.kind === 'PipelineError'
            ? event.data
            : (event.detail?.reason ?? JSON.stringify(event.detail));
      report.skipped.push({
        line,
        name: fnNameAt((report.lines ??= report.code.split('\n')), line),
        kind: event.kind,
        reason,
      });
    } else if (event.kind === 'CompileDiagnostic') {
      report.diagnostics += 1;
    }
  },
};

const plugins = babelConfig.plugins.map(plugin =>
  Array.isArray(plugin) && plugin[0] === 'babel-plugin-react-compiler'
    ? ['babel-plugin-react-compiler', { ...plugin[1], logger }]
    : plugin,
);

const babelOptions: Record<string, unknown> = {
  presets: babelConfig.presets,
  plugins,
  babelrc: false,
  configFile: false,
  cwd: ROOT,
  caller: { name: 'metro', isDev: false, platform: 'android' },
};

const EXTENSIONS = /\.(ts|tsx|js|jsx)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.test(entry.name) && sources(full)) out.push(full);
  }
  return out;
}

function changedFiles(base: string): string[] {
  const git = (...cmd: string[]): string[] =>
    execFileSync('git', cmd, { cwd: ROOT })
      .toString()
      .split('\n')
      .filter(Boolean);
  let mergeBase: string | undefined;
  try {
    mergeBase = git('merge-base', base, 'HEAD')[0];
  } catch {
    // Shallow CI checkouts may lack the common history merge-base walks.
  }
  const names = new Set([
    ...(mergeBase !== undefined
      ? git('diff', '--name-only', mergeBase)
      : git('diff', '--name-only', base, 'HEAD')),
    ...git('diff', '--name-only', 'HEAD'),
    ...git('ls-files', '--others', '--exclude-standard'),
  ]);
  return [...names]
    .map(rel => path.join(ROOT, rel))
    .filter(file => existsSync(file) && EXTENSIONS.test(file) && sources(file));
}

async function transformAll(files: string[]): Promise<void> {
  let cursor = 0;
  let done = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(8, os.cpus().length - 2)) },
    async () => {
      while (cursor < files.length) {
        const file = files[cursor++];
        const report = fileReport(file);
        try {
          await babel.transformAsync(report.code, {
            ...babelOptions,
            filename: file,
          });
        } catch (error) {
          report.error = (error as Error).message.split('\n')[0];
        }
        if (++done % 25 === 0)
          process.stderr.write(`\r  checked ${done}/${files.length}`);
      }
    },
  );
  await Promise.all(workers);
  process.stderr.write('\r'.padEnd(40) + '\r');
}

const scopeDirs = ['app', 'screens', 'ui'];
const files = baseRef
  ? changedFiles(baseRef)
  : scopeDirs.flatMap(dir => walk(path.join(ROOT, dir)));
if (files.length === 0) {
  console.log(
    `no in-scope files ${baseRef ? `changed against ${baseRef}` : 'found'}`,
  );
  process.exit(0);
}
await transformAll(files);

const list = [...reports.values()];
const totals = {
  files: list.length,
  optimized: list.reduce((n, r) => n + r.optimized, 0),
  skipped: list.reduce((n, r) => n + r.skipped.length, 0),
  diagnostics: list.reduce((n, r) => n + r.diagnostics, 0),
  errors: list.filter(r => r.error !== null).length,
};

console.log(
  `React Compiler healthcheck${baseRef ? ` (changed vs ${baseRef})` : ''}`,
);
console.log(
  `files: ${totals.files}  optimized functions: ${totals.optimized}  skipped: ${totals.skipped}  diagnostics: ${totals.diagnostics}  transform errors: ${totals.errors}`,
);

const skipped = list
  .flatMap(r =>
    r.skipped.map(s => ({ file: path.relative(ROOT, r.file), ...s })),
  )
  .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const { file, line, name, kind, reason } of skipped) {
  console.log(
    `  ${file}:${line}${name ? `  ${name}` : ''}  [${kind}] ${reason}`,
  );
}
for (const r of list) {
  if (r.error !== null) {
    console.log(
      `  ${path.relative(ROOT, r.file)}  [TransformError] ${r.error}`,
    );
  }
}

if (jsonPath !== undefined) {
  writeFileSync(jsonPath, `${JSON.stringify({ totals, skipped }, null, 2)}\n`);
  console.log(`json: ${jsonPath}`);
}

const failing =
  totals.errors > 0 ||
  ((baseRef !== undefined || strict) && totals.skipped > 0);
if (failing) {
  const what =
    totals.errors > 0
      ? `${totals.errors} transform error(s)`
      : `${totals.skipped} skipped component(s)/hook(s)`;
  console.error(
    `FAIL: ${what}${baseRef !== undefined ? ' among changed files' : ''}`,
  );
  process.exit(1);
}
console.log('OK');
