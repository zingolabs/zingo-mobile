import ts from 'typescript';

export type Source = { path: string; text: string };

export type Import = { from: string; typeOnly: boolean; names: string[] };

export type Edge = { file: string; from: string };

export type Layering = { kind: 'layered' } | { kind: 'crossed'; edges: Edge[] };

export type Merging =
  { kind: 'merged' } | { kind: 'repeated'; modules: string[] };

export type Reexports =
  { kind: 'single' } | { kind: 'double'; names: string[] };

export type Declarations =
  { kind: 'plain' } | { kind: 'legacy'; enums: string[]; trailing: number[] };

export type Grouping =
  { kind: 'domain' } | { kind: 'syntactic'; files: string[] };

const parse = (text: string): ts.SourceFile =>
  ts.createSourceFile(
    'source.tsx',
    text,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX,
  );

const nodesOf = (node: ts.Node, file: ts.SourceFile): ts.Node[] => [
  node,
  ...node.getChildren(file).flatMap(child => nodesOf(child, file)),
];

const namesOf = (clause: ts.ImportClause | undefined): string[] => {
  const bindings = clause?.namedBindings;
  const named =
    bindings && ts.isNamedImports(bindings)
      ? bindings.elements.map(
          element => (element.propertyName ?? element.name).text,
        )
      : [];
  return clause?.name ? [clause.name.text, ...named] : named;
};

export const importsOf = (text: string): Import[] =>
  parse(text)
    .statements.filter(ts.isImportDeclaration)
    .flatMap(statement =>
      ts.isStringLiteral(statement.moduleSpecifier)
        ? [
            {
              from: statement.moduleSpecifier.text,
              typeOnly: statement.importClause?.isTypeOnly ?? false,
              names: namesOf(statement.importClause),
            },
          ]
        : [],
    );

export const layering = (
  dir: string,
  forbidden: string[],
  sources: Source[],
): Layering => {
  const edges = sources
    .filter(source => source.path.startsWith(dir))
    .flatMap(source =>
      importsOf(source.text)
        .filter(found =>
          forbidden.some(prefix => found.from.startsWith(prefix)),
        )
        .map(found => ({ file: source.path, from: found.from })),
    );
  return edges.length === 0 ? { kind: 'layered' } : { kind: 'crossed', edges };
};

export const merging = (text: string): Merging => {
  const keys = importsOf(text).map(
    found => `${found.typeOnly ? 'type' : 'value'} ${found.from}`,
  );
  const modules = [
    ...new Set(
      keys
        .filter((key, index) => keys.indexOf(key) !== index)
        .map(key => key.slice(key.indexOf(' ') + 1)),
    ),
  ];
  return modules.length === 0
    ? { kind: 'merged' }
    : { kind: 'repeated', modules };
};

export const reexports = (barrel: string, prefix: string): Reexports => {
  const names = importsOf(barrel)
    .filter(found => found.from.startsWith(prefix))
    .flatMap(found => found.names);
  return names.length === 0 ? { kind: 'single' } : { kind: 'double', names };
};

export const declarations = (text: string): Declarations => {
  const file = parse(text);
  const nodes = nodesOf(file, file);
  const enums = nodes
    .filter(ts.isEnumDeclaration)
    .map(declared => declared.name.text);
  const starts = nodes.flatMap(node =>
    (ts.getTrailingCommentRanges(text, node.end) ?? []).map(range => range.pos),
  );
  const trailing = [...new Set(starts)]
    .map(start => file.getLineAndCharacterOfPosition(start).line + 1)
    .sort((a, b) => a - b);
  return enums.length === 0 && trailing.length === 0
    ? { kind: 'plain' }
    : { kind: 'legacy', enums, trailing };
};

const KINDS = /^(types|enums|classes|interfaces)\.tsx?$/;

export const grouping = (files: string[]): Grouping => {
  const syntactic = files.filter(file => KINDS.test(file));
  return syntactic.length === 0
    ? { kind: 'domain' }
    : { kind: 'syntactic', files: syntactic };
};
