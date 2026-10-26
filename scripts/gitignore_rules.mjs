// Pure matcher of directory ignore rules against the paths a tool writes.

function matches(rule, path) {
  const prefix = rule.endsWith('/') ? rule.slice(0, -1) : rule;
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function unmatchedRules(rules, paths) {
  return rules.filter(rule => !paths.some(path => matches(rule, path)));
}
