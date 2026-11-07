import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compileReport,
  sourceFiles,
} from '../scripts/react_compiler_report.mjs';

const CLEAN = `
import React from 'react';
export const Clean = ({ label }) => <div>{label}</div>;
`;
const REF_IN_RENDER = `
import React, { useRef } from 'react';
export const Reads = () => {
  const count = useRef(0);
  return <div>{count.current}</div>;
};
`;
const OPTED_OUT = `
import React, { useRef } from 'react';
export const Keeps = () => {
  'use no memo';
  const count = useRef(0);
  return <div>{count.current}</div>;
};
`;

const fixture = files => {
  const root = mkdtempSync(join(tmpdir(), 'react-compiler-report-'));
  mkdirSync(join(root, 'ui', '__tests__'), { recursive: true });
  for (const [path, source] of Object.entries(files)) {
    writeFileSync(join(root, path), source);
  }
  return root;
};

describe('react compiler report', () => {
  // Tests that a component the compiler refuses is reported with its file and line when it reads a ref during render.
  test('a refused component is reported', () => {
    const root = fixture({ 'ui/Reads.tsx': REF_IN_RENDER });
    const { compiled, errors, skips } = compileReport(root, sourceFiles(root));
    expect(compiled).toBe(0);
    expect(skips).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^ui\/Reads\.tsx:\d+ {2}Refs:/);
  });

  // Tests that a component that says 'use no memo' passes as a skip when the compiler would refuse it.
  test("a 'use no memo' component is a skip", () => {
    const root = fixture({ 'ui/Keeps.tsx': OPTED_OUT, 'ui/Clean.tsx': CLEAN });
    const { compiled, errors, skips } = compileReport(root, sourceFiles(root));
    expect(compiled).toBe(1);
    expect(errors).toEqual([]);
    expect(skips).toEqual(["ui/Keeps.tsx:3  'use no memo'"]);
  });

  // Tests that test files are left out when they sit under __tests__ or carry a .test. suffix.
  test('test files are left out', () => {
    const root = fixture({
      'ui/Clean.tsx': CLEAN,
      'ui/__tests__/Reads.tsx': REF_IN_RENDER,
      'ui/Reads.test.tsx': REF_IN_RENDER,
    });
    expect(sourceFiles(root)).toEqual([join(root, 'ui', 'Clean.tsx')]);
  });
});
