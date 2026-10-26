import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import {
  calledWorkflows,
  localActionsUsed,
  stepsUsing,
  undeclaredInputs,
  unreadExpressionEnv,
  unreadInputs,
} from '../scripts/workflow_graph.mjs';

const GITHUB = join(__dirname, '..', '.github');
const WORKFLOWS = join(GITHUB, 'workflows');
const ACTIONS = join(GITHUB, 'actions');

function workflow(file) {
  const text = readFileSync(join(WORKFLOWS, file), 'utf8');
  return { file, text, doc: parse(text) };
}

const workflows = readdirSync(WORKFLOWS).sort().map(workflow);
const actions = readdirSync(ACTIONS)
  .sort()
  .map(name => ({
    name,
    doc: parse(readFileSync(join(ACTIONS, name, 'action.yml'), 'utf8')),
  }));
const calleeOf = uses =>
  workflows.find(({ file }) => uses === `./.github/workflows/${file}`).doc;

describe('workflow graph', () => {
  // Tests that an input is reported when no expression in the file reads it.
  test('an unread input is reported', () => {
    const text =
      'on:\n  workflow_call:\n    inputs:\n      a: {}\n      b: {}\njobs:\n  j:\n    steps:\n      - run: echo ${{ inputs.a }}\n';
    expect(unreadInputs(parse(text), text)).toEqual(['b']);
  });

  // Tests that a hyphenated env key is reported when no expression reads it. A plain key reaches child processes.
  test('an unread hyphenated env key is reported', () => {
    const text =
      'jobs:\n  j:\n    env:\n      CACHE-KEY: x\n      PLAIN: y\n    steps:\n      - run: echo $PLAIN\n';
    expect(unreadExpressionEnv(parse(text), text)).toEqual(['CACHE-KEY']);
  });

  // Tests that a passed input is reported when the called workflow declares no such input.
  test('an undeclared input is reported', () => {
    const caller = parse(
      'jobs:\n  j:\n    uses: ./.github/workflows/x.yaml\n    with:\n      known: 1\n      extra: 2\n',
    );
    const callee = parse(
      'on:\n  workflow_call:\n    inputs:\n      known: {}\n',
    );
    expect(undeclaredInputs(caller, () => callee)).toEqual(['j: extra']);
  });
});

describe('the workflows', () => {
  // Tests that every reusable workflow reads each input it declares.
  test('every declared input is read', () => {
    for (const { file, doc, text } of workflows) {
      expect({ file, unread: unreadInputs(doc, text) }).toEqual({
        file,
        unread: [],
      });
    }
  });

  // Tests that every hyphenated env key is read by an expression.
  test('every expression-only env key is read', () => {
    for (const { file, doc, text } of workflows) {
      expect({ file, unread: unreadExpressionEnv(doc, text) }).toEqual({
        file,
        unread: [],
      });
    }
  });

  // Tests that every caller passes only inputs the called workflow declares.
  test('every passed input is declared', () => {
    for (const { file, doc } of workflows) {
      expect({ file, undeclared: undeclaredInputs(doc, calleeOf) }).toEqual({
        file,
        undeclared: [],
      });
    }
  });

  // Tests that every composite action has a caller among the workflows and actions.
  test('every composite action has a caller', () => {
    const used = localActionsUsed(
      [...workflows, ...actions].map(({ doc }) => doc),
    );
    expect(
      actions.map(({ name }) => name).filter(name => !used.has(name)),
    ).toEqual([]);
  });

  // Tests that the nightly Maestro run calls no reusable workflow when the Binding Layer comes from the Bundle Pin.
  test('maestro-nightly calls no reusable workflow', () => {
    expect(calledWorkflows(workflow('maestro-nightly.yaml').doc)).toEqual([]);
  });

  // Tests that the release assembles from the pinned bundle alone when a tag is pushed.
  test('the release builds from the Bundle Pin', () => {
    const { doc, text } = workflow('android-release.yaml');
    expect(Object.keys(doc.jobs)).toEqual(['android-release']);
    expect(doc.jobs['android-release'].needs).toBeUndefined();
    expect(stepsUsing(doc, 'actions/download-artifact')).toEqual([]);
    expect(text).not.toContain('bindingLayerPrebuilt');
  });
});
