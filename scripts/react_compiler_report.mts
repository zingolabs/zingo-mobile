#!/usr/bin/env tsx
// React Compiler healthcheck over app/ui/screens. Reports which components
// and hooks the compiler optimizes, which it skips on an opt-out directive
// (CompileSkip), and which it bails out of (CompileError, PipelineError).
// With --base=<ref>, checks only files changed against that ref, compiles each
// one's version on that ref too, and exits non-zero when a file carries more
// bailouts than its base version. A skip never fails the check.
//
// The compiler entry is read from babel.react-compiler.js.
//
// Usage:
//   tsx scripts/react_compiler_report.mts                     full report
//   tsx scripts/react_compiler_report.mts --base=dev          changed files
//   tsx scripts/react_compiler_report.mts --strict            fail on any bailout
//   tsx scripts/react_compiler_report.mts --json=out.json     also write JSON

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { PluginItem, TransformOptions } from '@babel/core';
import type { Logger } from 'babel-plugin-react-compiler';
import {
  failure,
  fnNameAt,
  gateFails,
  outcomeOf,
  parseArgs,
  regressions,
  resolveBase,
  tally,
  transformEach,
  type Base,
  type Commit,
  type Transform,
  type Uncompiled,
} from './react_compiler_skips';

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type CompilerOptions = {
  sources: (filename: string) => boolean;
};

type BabelConfig = { presets: PluginItem[]; plugins: PluginItem[] };

type Named = Uncompiled & { name: string };

type FileReport = {
  file: string;
  code: string;
  optimized: number;
  uncompiled: Named[];
  diagnostics: number;
  transform: Transform;
};

const options = parseArgs(process.argv.slice(2));
if (options.kind === 'error') {
  console.error(options.message);
  process.exit(2);
}
const { scope, json, strict } = options;

const babel: typeof import('@babel/core') = require_('@babel/core');
const babelConfig: BabelConfig = require_(path.join(ROOT, 'babel.config.js'));

const reactCompiler: [string, CompilerOptions] = require_(
  path.join(ROOT, 'babel.react-compiler.js'),
);
const { sources } = reactCompiler[1];

const headReports = new Map<string, FileReport>();
const baseReports = new Map<string, FileReport>();
let active = headReports;

const diskCode = (file: string): string => readFileSync(file, 'utf8');

function register(file: string, codeOf: (file: string) => string): FileReport {
  const report: FileReport = {
    file,
    code: codeOf(file),
    optimized: 0,
    uncompiled: [],
    diagnostics: 0,
    transform: { kind: 'compiled' },
  };
  active.set(file, report);
  return report;
}

function fileReport(file: string, codeOf = diskCode): FileReport {
  return active.get(file) ?? register(file, codeOf);
}

const git = (...cmd: string[]): string =>
  execFileSync('git', cmd, { cwd: ROOT }).toString();
const gitLines = (...cmd: string[]): string[] =>
  git(...cmd)
    .split('\n')
    .filter(Boolean);

const logger: Logger = {
  logEvent(filename, event): void {
    if (typeof filename !== 'string' || !sources(filename)) return;
    const report = fileReport(filename);
    const outcome = outcomeOf(event);
    switch (outcome.kind) {
      case 'optimized':
        report.optimized += 1;
        break;
      case 'diagnostic':
        report.diagnostics += 1;
        break;
      case 'uncompiled':
        report.uncompiled.push({
          ...outcome.uncompiled,
          name: fnNameAt(report.code, outcome.uncompiled.line),
        });
        break;
      case 'ignored':
        break;
    }
  },
};

const plugins: PluginItem[] = babelConfig.plugins.map(plugin =>
  plugin === reactCompiler
    ? [reactCompiler[0], { ...reactCompiler[1], logger }]
    : plugin,
);

const metroCaller: NonNullable<TransformOptions['caller']> & {
  isDev: boolean;
  platform: string;
} = { name: 'metro', isDev: false, platform: 'android' };

const babelOptions: TransformOptions = {
  presets: babelConfig.presets,
  plugins,
  babelrc: false,
  configFile: false,
  cwd: ROOT,
  caller: metroCaller,
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
  const names = new Set([
    ...gitLines('diff', '--name-only', base, 'HEAD'),
    ...gitLines('diff', '--name-only', 'HEAD'),
    ...gitLines('ls-files', '--others', '--exclude-standard'),
  ]);
  return [...names]
    .map(rel => path.join(ROOT, rel))
    .filter(file => existsSync(file) && EXTENSIONS.test(file) && sources(file));
}

// HEAD path -> the path the same file had on base, for files the diff pairs
// as renames. A pure move keeps its base bailout count this way; pairing by
// HEAD path alone would read every moved file as new and its bailouts as
// regressions.
const renames = new Map<string, string>();

/** A path as git names it: relative to the root, with forward slashes on every OS. */
const gitPath = (file: string): string =>
  path.relative(ROOT, file).split(path.sep).join(path.posix.sep);

function filesInBase(base: string, files: string[]): string[] {
  const relOf = gitPath;
  const present = new Set(
    gitLines(
      'ls-tree',
      '-r',
      '--name-only',
      base,
      '--',
      ...files.map(file => renames.get(relOf(file)) ?? relOf(file)),
    ),
  );
  return files.filter(file =>
    present.has(renames.get(relOf(file)) ?? relOf(file)),
  );
}

const baseCode =
  (base: string) =>
  (file: string): string =>
    git('show', `${base}:${renames.get(gitPath(file)) ?? gitPath(file)}`);

async function transformAll(files: string[], codeOf = diskCode): Promise<void> {
  await transformEach(files, async file => {
    const report = fileReport(file, codeOf);
    try {
      await babel.transformAsync(report.code, {
        ...babelOptions,
        filename: file,
      });
    } catch (thrown) {
      report.transform = failure(thrown);
    }
  });
}

const probe = (rev: string): Commit => {
  const run = spawnSync(
    'git',
    ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`],
    { cwd: ROOT },
  );
  return run.status === 0
    ? { kind: 'commit', sha: run.stdout.toString().trim() }
    : { kind: 'missing' };
};
const target: Base | { kind: 'all' } =
  scope.kind === 'changed'
    ? resolveBase(scope.base, probe, gitLines('remote'))
    : { kind: 'all' };
if (target.kind === 'error') {
  console.error(target.message);
  process.exit(2);
}

const scopeDirs = ['app', 'screens', 'ui'];
const files =
  target.kind === 'base'
    ? changedFiles(target.sha)
    : scopeDirs.flatMap(dir => walk(path.join(ROOT, dir)));
if (files.length === 0) {
  console.log(
    `no in-scope files ${target.kind === 'base' ? `changed against ${target.ref}` : 'found'}`,
  );
  process.exit(0);
}
if (target.kind === 'base') {
  for (const line of gitLines(
    'diff',
    '--name-status',
    '-M',
    target.sha,
    'HEAD',
  )) {
    const [status, from, to] = line.split('\t');
    if (status.startsWith('R') && from && to) renames.set(to, from);
  }
  active = baseReports;
  await transformAll(filesInBase(target.sha, files), baseCode(target.sha));
  active = headReports;
}
await transformAll(files);

const bailoutsByFile = (list: Iterable<FileReport>): Record<string, number> =>
  Object.fromEntries(
    [...list].map(r => [
      path.relative(ROOT, r.file),
      r.uncompiled.filter(u => u.cause === 'bailout').length,
    ]),
  );

const list = [...headReports.values()];
const uncompiled = list
  .flatMap(r =>
    r.uncompiled.map(u => ({ file: path.relative(ROOT, r.file), ...u })),
  )
  .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
const regressed =
  target.kind === 'base'
    ? regressions(bailoutsByFile(baseReports.values()), bailoutsByFile(list))
    : [];
const newBailouts = regressed.reduce((n, r) => n + r.head - r.base, 0);
const totals = {
  files: list.length,
  optimized: list.reduce((n, r) => n + r.optimized, 0),
  ...tally(uncompiled),
  diagnostics: list.reduce((n, r) => n + r.diagnostics, 0),
  errors: list.filter(r => r.transform.kind === 'error').length,
};

console.log(
  `React Compiler healthcheck${target.kind === 'base' ? ` (changed vs ${target.ref})` : ''}`,
);
console.log(
  `files: ${totals.files}  optimized functions: ${totals.optimized}  bailouts: ${totals.bailouts}  skips: ${totals.skips}  diagnostics: ${totals.diagnostics}  transform errors: ${totals.errors}`,
);

for (const { file, line, name, cause, reason } of uncompiled) {
  console.log(
    `  ${file}:${line}${name ? `  ${name}` : ''}  [${cause}] ${reason}`,
  );
}
for (const r of list) {
  if (r.transform.kind === 'error') {
    console.log(
      `  ${path.relative(ROOT, r.file)}  [TransformError] ${r.transform.message}`,
    );
  }
}
for (const r of regressed) {
  console.log(`  ${r.file}  bailouts on base: ${r.base}, on HEAD: ${r.head}`);
}

const keep = <T,>(_key: string, field: T): T => field;
if (json.kind === 'file') {
  writeFileSync(
    json.path,
    `${JSON.stringify({ totals, uncompiled, regressed }, keep, 2)}\n`,
  );
  console.log(`json: ${json.path}`);
}

if (
  gateFails({
    gated: target.kind === 'base' || strict,
    bailouts: target.kind === 'base' ? newBailouts : totals.bailouts,
    errors: totals.errors,
  })
) {
  const what =
    totals.errors > 0
      ? `${totals.errors} transform error(s)`
      : target.kind === 'base'
        ? `${newBailouts} new bailout(s) among changed files`
        : `${totals.bailouts} bailout(s)`;
  console.error(`FAIL: ${what}`);
  process.exit(1);
}
console.log('OK');
