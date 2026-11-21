import fs from 'fs';
import path from 'path';

const ROOTS = ['app', 'screens', 'ui'];
/** A JSX opening tag, never a type argument such as useRef<ScrollView>. */
const TAG =
  /(?<![\w.])<(ScrollView|KeyboardAwareScrollView|BottomSheetScrollView)\b/g;

const sources = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sources(full);
    }
    return /\.tsx$/.test(entry.name) && !/\.stories\.tsx$/.test(entry.name)
      ? [full]
      : [];
  });

/** The opening tag that starts at `start`, up to its `>` outside any braces. */
const openingTag = (text: string, start: number): string => {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
    } else if (c === '>' && depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
};

test('Tests that a tap on a control reaches it when the keyboard is open. A scroll container on its default dismisses the keyboard and drops the tap.', () => {
  const root = path.join(__dirname, '..');
  const missing = ROOTS.flatMap(dir => sources(path.join(root, dir))).flatMap(
    file => {
      const text = fs.readFileSync(file, 'utf8');
      return [...text.matchAll(TAG)]
        .filter(
          match =>
            !openingTag(text, match.index ?? 0).includes(
              'keyboardShouldPersistTaps',
            ),
        )
        .map(match => `${path.relative(root, file)} <${match[1]}>`);
    },
  );
  expect(missing).toEqual([]);
});
