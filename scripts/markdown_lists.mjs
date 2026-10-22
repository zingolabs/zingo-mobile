// Pure reader of the ordered lists in a Markdown document.

const ITEM = /^(\d+)\. /;

export function orderedListBreaks(markdown) {
  const breaks = [];
  let previous;
  markdown.split('\n').forEach((line, index) => {
    const item = line.match(ITEM);
    if (item) {
      const found = Number(item[1]);
      if (previous !== undefined && found !== 1 && found !== previous + 1) {
        breaks.push({ line: index + 1, found, expected: previous + 1 });
      }
      previous = found;
    } else if (line.trim() !== '' && !/^\s/.test(line)) {
      previous = undefined;
    }
  });
  return breaks;
}
