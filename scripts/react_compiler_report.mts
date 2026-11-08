#!/usr/bin/env tsx
// React Compiler healthcheck over app/ui/screens. Reports which components
// and hooks the compiler optimizes, which it skips on an opt-out directive
// (CompileSkip), and which it bails out of (CompileError, PipelineError).
// With --base=<ref>, checks only files changed against that ref, compiles each
// one's version on that ref too, and exits non-zero when a file carries more
// bailouts than its base version. A skip never fails the check.
//
// The compiler options are read from babel.config.js.
//
// Usage:
//   tsx scripts/react_compiler_report.mts                     full report
//   tsx scripts/react_compiler_report.mts --base=origin/dev   changed files
//   tsx scripts/react_compiler_report.mts --strict            fail on any bailout
//   tsx scripts/react_compiler_report.mts --json=out.json     also write JSON

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  gateFails,
  regressions,
  tally,
  uncompiledFrom,
  type CompilerEvent,
  type Uncompiled,
} from './react_compiler_skips';

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

type Named = Uncompiled & { name: string | null };

type FileReport = {
  file: string;
  code: string;
  lines: string[] | null;
  optimized: number;
  uncompiled: Named[];
  diagnostics: number;
  error: string | null;
};

const args = process.argv.slice(2);
// The last occurrence wins, so a CLI --base overrides a script default.
const argValue = (name: string): string | undefined => {
  for (let i = args.length - 1; i >= 0; i--) {
    const arg = args[i];
    if (arg === name || arg.startsWith(`${name}=`)) {
      const eq = arg.indexOf('=');
      return eq === -1 ? '' : arg.slice(eq + 1);
    }
  }
  return undefined;
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

const headReports = new Map<string, FileReport>();
const baseReports = new Map<string, FileReport>();
let active = headReports;

const diskCode = (file: string): string => readFileSync(file, 'utf8');

function fileReport(file: string, codeOf = diskCode): FileReport {
  let report = active.get(file);
  if (report === undefined) {
    report = {
      file,
      code: codeOf(file),
      lines: null,
      optimized: 0,
      uncompiled: [],
      diagnostics: 0,
      error: null,
    };
    active.set(file, report);
  }
  return report;
}

const git = (...cmd: string[]): string =>
  execFileSync('git', cmd, { cwd: ROOT }).toString();
const gitLines = (...cmd: string[]): string[] =>
  git(...cmd)
    .split('\n')
    .filter(Boolean);

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
      return;
    }
    if (event.kind === 'CompileDiagnostic') {
      report.diagnostics += 1;
      return;
    }
    const uncompiled = uncompiledFrom(event);
    if (uncompiled === undefined) return;
    report.uncompiled.push({
      ...uncompiled,
      name: fnNameAt(
        (report.lines ??= report.code.split('\n')),
        uncompiled.line,
      ),
    });
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
  const names = new Set([
    ...gitLines('diff', '--name-only', base, 'HEAD'),
    ...gitLines('diff', '--name-only', 'HEAD'),
    ...gitLines('ls-files', '--others', '--exclude-standard'),
  ]);
  return [...names]
    .map(rel => path.join(ROOT, rel))
    .filter(file => existsSync(file) && EXTENSIONS.test(file) && sources(file));
}

function filesInBase(base: string, files: string[]): string[] {
  const rels = files.map(file => path.relative(ROOT, file));
  const present = new Set(
    gitLines('ls-tree', '-r', '--name-only', base, '--', ...rels),
  );
  return files.filter(file => present.has(path.relative(ROOT, file)));
}

const baseCode =
  (base: string) =>
  (file: string): string =>
    git('show', `${base}:${path.relative(ROOT, file)}`);

async function transformAll(files: string[], codeOf = diskCode): Promise<void> {
  let cursor = 0;
  let done = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(8, os.cpus().length - 2)) },
    async () => {
      while (cursor < files.length) {
        const file = files[cursor++];
        const report = fileReport(file, codeOf);
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
if (baseRef !== undefined) {
  active = baseReports;
  await transformAll(filesInBase(baseRef, files), baseCode(baseRef));
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
  baseRef !== undefined
    ? regressions(bailoutsByFile(baseReports.values()), bailoutsByFile(list))
    : [];
const newBailouts = regressed.reduce((n, r) => n + r.head - r.base, 0);
const totals = {
  files: list.length,
  optimized: list.reduce((n, r) => n + r.optimized, 0),
  ...tally(uncompiled),
  diagnostics: list.reduce((n, r) => n + r.diagnostics, 0),
  errors: list.filter(r => r.error !== null).length,
};

console.log(
  `React Compiler healthcheck${baseRef ? ` (changed vs ${baseRef})` : ''}`,
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
  if (r.error !== null) {
    console.log(
      `  ${path.relative(ROOT, r.file)}  [TransformError] ${r.error}`,
    );
  }
}
for (const { file, base, head } of regressed) {
  console.log(`  ${file}  bailouts on ${baseRef}: ${base}, on HEAD: ${head}`);
}

if (jsonPath !== undefined) {
  writeFileSync(
    jsonPath,
    `${JSON.stringify({ totals, uncompiled, regressed }, null, 2)}\n`,
  );
  console.log(`json: ${jsonPath}`);
}

if (
  gateFails({
    gated: baseRef !== undefined || strict,
    bailouts: baseRef !== undefined ? newBailouts : totals.bailouts,
    errors: totals.errors,
  })
) {
  const what =
    totals.errors > 0
      ? `${totals.errors} transform error(s)`
      : baseRef !== undefined
        ? `${newBailouts} new bailout(s) among changed files`
        : `${totals.bailouts} bailout(s)`;
  console.error(`FAIL: ${what}`);
  process.exit(1);
}
console.log('OK');
