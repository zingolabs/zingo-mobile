// Runs the React compiler over the app's sources and lists every component or
// hook it refuses. A refusal fails the run. A function that says 'use no memo'
// is listed and passes.
import { transformFileSync } from '@babel/core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const SOURCE_DIRS = ['app', 'screens', 'ui'];
const SOURCE = /\.(tsx|ts|jsx|js)$/;
const EXCLUDED = /(^|\/)(__tests__|__mocks__)\/|\.(test|spec)\./;
const OPT_OUT = /^\s*'use no memo';\s*$/;

export const sourceFiles = root =>
  SOURCE_DIRS.flatMap(dir => filesUnder(join(root, dir))).filter(
    file => SOURCE.test(file) && !EXCLUDED.test(relative(root, file)),
  );

const filesUnder = dir => {
  const stat = statSync(dir, { throwIfNoEntry: false });
  if (!stat) {
    return [];
  }
  if (!stat.isDirectory()) {
    return [dir];
  }
  return readdirSync(dir).flatMap(entry => filesUnder(join(dir, entry)));
};

export const compileReport = (root, files) => {
  const errors = [];
  const skips = [];
  let compiled = 0;
  for (const file of files) {
    const path = relative(root, file);
    const optOuts = optOutLines(file);
    const logEvent = (_filename, event) => {
      if (event.kind === 'CompileSuccess') {
        compiled += 1;
      } else if (event.kind === 'CompileError') {
        if (optedOut(optOuts, event.fnLoc)) {
          skips.push(`${path}:${event.fnLoc.start.line}  'use no memo'`);
        } else {
          errors.push(describeError(path, event));
        }
      } else if (event.kind === 'CompileSkip') {
        skips.push(`${path}  ${event.fnName ?? ''}  ${event.reason}`);
      }
    };
    try {
      transformFileSync(file, {
        configFile: false,
        babelrc: false,
        presets: ['module:@react-native/babel-preset'],
        plugins: [
          [
            'babel-plugin-react-compiler',
            { target: '19', panicThreshold: 'none', logger: { logEvent } },
          ],
        ],
      });
    } catch (error) {
      errors.push(`${path}  ${error.message.split('\n')[0]}`);
    }
  }
  return { compiled, errors, skips: [...new Set(skips)] };
};

// The compiler logs the errors of a function that says 'use no memo' and
// leaves it as written; the line of the directive tells those apart.
const optOutLines = file =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, index) => (OPT_OUT.test(line) ? [index + 1] : []));

const optedOut = (lines, fnLoc) =>
  fnLoc != null &&
  lines.some(line => fnLoc.start.line <= line && line <= fnLoc.end.line);

const describeError = (path, event) => {
  const detail = event.detail ?? {};
  const line = detail.loc?.start?.line ?? event.fnLoc?.start?.line;
  const where = line === undefined ? path : `${path}:${line}`;
  const reason = detail.reason ?? detail.message ?? JSON.stringify(detail);
  const description = detail.description ? `\n    ${detail.description}` : '';
  return `${where}  ${detail.category ?? ''}: ${reason}${description}`;
};

const main = () => {
  const root = process.cwd();
  const { compiled, errors, skips } = compileReport(root, sourceFiles(root));
  for (const skip of skips) {
    console.log(`skipped on request: ${skip}`);
  }
  for (const error of errors) {
    console.error(error);
  }
  console.log(
    `react compiler: ${compiled} compiled, ${skips.length} skipped on request, ${errors.length} refused`,
  );
  process.exit(errors.length === 0 ? 0 : 1);
};

if (basename(process.argv[1] ?? '') === 'react_compiler_report.mjs') {
  main();
}
