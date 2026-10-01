import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse, parseAllDocuments } from 'yaml';

const FLOWS_DIR = join(__dirname, '..', '.maestro');
const WORKFLOW = join(
  __dirname,
  '..',
  '.github',
  'workflows',
  'maestro-nightly.yaml',
);

type Step = Record<string, unknown>;

/** The step list of a Maestro flow file, which follows its header document. */
function steps(file: string): Step[] {
  const documents = parseAllDocuments(
    readFileSync(join(FLOWS_DIR, file), 'utf8'),
  );
  return documents[documents.length - 1].toJS() as Step[];
}

function topLevelFlows(): string[] {
  return readdirSync(FLOWS_DIR).filter(name => name.endsWith('.yaml'));
}

function stepsOf(flow: Step[], command: string): Record<string, unknown>[] {
  return flow
    .filter(step => command in step)
    .map(step => step[command] as Record<string, unknown>);
}

/** The server that flow 06 types into the custom server field. */
const CUSTOM_SERVER = 'https://na.zec.rocks:443';

/** The server that flow 07 picks from the list. */
const LIST_SERVER = 'https://zec.rocks:443';

/**
 * Whether a selector names exactly the given server, once the regex escapes
 * and the optional trailing slash are removed.
 */
function names(selector: unknown, server: string): boolean {
  return String(selector).replace(/\\/g, '').replace(/\/\?$/, '') === server;
}

function androidScriptLines(): string[] {
  const workflow = parse(readFileSync(WORKFLOW, 'utf8')) as {
    jobs: Record<
      string,
      { steps: { name?: string; with?: { script?: string; path?: string } }[] }
    >;
  };
  const run = workflow.jobs['maestro-android'].steps.find(
    step => step.name === 'Run Maestro tests on Android emulator',
  );
  return (run?.with?.script ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}

function androidArtifactPaths(): string[] {
  const workflow = parse(readFileSync(WORKFLOW, 'utf8')) as {
    jobs: Record<
      string,
      { steps: { name?: string; with?: { path?: string } }[] }
    >;
  };
  const upload = workflow.jobs['maestro-android'].steps.find(
    step => step.name === 'Upload Maestro report on failure',
  );
  return (upload?.with?.path ?? '').split('\n').map(line => line.trim());
}

describe('the nightly Android step', () => {
  /**
   * Tests that the screen-off timeout is armed after the screen-awake flow
   * has loaded its wallet, when the app holds the keep-awake lock. Before
   * that, an input-free wait longer than the timeout lets the display sleep.
   */
  test('arms the screen-off timeout after the screen-awake flow', () => {
    const lines = androidScriptLines();
    const armed = lines.findIndex(line =>
      line.includes('screen_off_timeout 10000'),
    );
    const flow = lines.findIndex(line =>
      line.includes('--include-tags=screen-awake'),
    );
    expect(armed).toBeGreaterThan(flow);
  });

  /**
   * Tests that no script line relies on shell state from another line,
   * because the emulator runner starts a new shell per line and stops at
   * the first non-zero line.
   */
  test('carries no shell state across script lines', () => {
    const stateful = androidScriptLines().filter(line =>
      /^(set [+-]e|EXIT=|exit \$EXIT|LOGCAT_PID=|kill \$LOGCAT_PID)|screen-off-timeout\.txt/.test(
        line,
      ),
    );
    expect(stateful).toEqual([]);
  });

  /**
   * Tests that the failure artifact carries the power dump that decides the
   * screen-awake check.
   */
  test('uploads the power dump with the failure report', () => {
    expect(androidArtifactPaths()).toContain('/tmp/dumpsys-power.txt');
  });
});

describe('the Maestro flows', () => {
  /**
   * Tests that every flow takes its onboarding from a shared flow file,
   * so a renamed onboarding element changes one file.
   */
  test('share the onboarding through runFlow', () => {
    for (const file of topLevelFlows()) {
      const text = readFileSync(join(FLOWS_DIR, file), 'utf8');
      expect([file, text.includes('loadingapp.createnewwallet')]).toEqual([
        file,
        false,
      ]);
      expect([file, text.includes('loadingapp.restorewalletseedufvk')]).toEqual(
        [file, false],
      );
    }
    expect(readdirSync(join(FLOWS_DIR, 'common')).sort()).toEqual([
      'create_wallet.yaml',
      'new_wallet_from_start_menu.yaml',
      'restore_wallet.yaml',
    ]);
  });

  /**
   * Tests that flow 07 picks a named server rather than the first row, which
   * may be the server already in use, and then reads the server row back.
   */
  test('07 picks the server by name and reads the row back', () => {
    const flow = steps('07_server_from_list.yaml');
    const taps = stepsOf(flow, 'tapOn');
    expect(
      taps.filter(tap => /list-server-select\.\d+$/.test(String(tap.id))),
    ).toEqual([]);
    expect(taps.some(tap => names(tap.text, LIST_SERVER))).toBe(true);
    const save = flow.findIndex(
      step => (step.tapOn as Step)?.id === 'settings.button.save',
    );
    const readBack = flow
      .slice(save)
      .some(step => names((step.assertVisible as Step)?.text, LIST_SERVER));
    expect(readBack).toBe(true);
  });

  /**
   * Tests that flow 07 scrolls the list to its row before the tap, and
   * takes the row inside the list, because the list can run below the fold
   * and the screen under the sheet can show the same server name.
   */
  test('07 scrolls to the row inside the list', () => {
    const flow = steps('07_server_from_list.yaml');
    const inList = (selector: Step | undefined): boolean =>
      names(selector?.text, LIST_SERVER) &&
      (selector?.childOf as Step)?.id === 'settings.list-server-select';
    const scroll = flow.findIndex(step =>
      inList((step.scrollUntilVisible as Step)?.element as Step),
    );
    const tap = flow.findIndex(step => inList(step.tapOn as Step));
    expect(scroll).toBeGreaterThanOrEqual(0);
    expect(tap).toBeGreaterThan(scroll);
  });

  /**
   * Tests that no flow names a zcash-infra server, because the registry
   * reports every one of them offline and the list leaves them out.
   */
  test('name no zcash-infra server', () => {
    for (const file of topLevelFlows()) {
      const text = readFileSync(join(FLOWS_DIR, file), 'utf8');
      expect([file, text.includes('zcash-infra')]).toEqual([file, false]);
    }
  });

  /**
   * Tests that flow 06 reads the server row back after it saves the custom
   * server.
   */
  test('06 reads the custom server row back after the save', () => {
    const flow = steps('06_custom_server.yaml');
    const save = flow.findIndex(
      step => (step.tapOn as Step)?.id === 'settings.button.save',
    );
    expect(save).toBeGreaterThan(0);
    const readBack = flow
      .slice(save)
      .some(step => names((step.assertVisible as Step)?.text, CUSTOM_SERVER));
    expect(readBack).toBe(true);
  });

  /**
   * Tests that flow 06 types the custom server inside a retry that reads the
   * field back, because the driver can drop characters while it types.
   */
  test('06 reads the typed field back and retries the entry', () => {
    const flow = steps('06_custom_server.yaml');
    const retries = stepsOf(flow, 'retry');
    expect(retries).toHaveLength(1);
    const commands = retries[0].commands as Step[];
    const typed = commands.findIndex(
      command => command.inputText === CUSTOM_SERVER,
    );
    const read = commands.findIndex(command => {
      const assertion = command.assertVisible as Step;
      return (
        assertion?.id === 'settings.custom-server-field' &&
        names(assertion?.text, CUSTOM_SERVER)
      );
    });
    expect(typed).toBeGreaterThanOrEqual(0);
    expect(read).toBeGreaterThan(typed);
  });

  /**
   * Tests that flow 08 opens the first transfer, which the wait before it
   * has already shown, instead of scrolling a paged list to its end.
   */
  test('08 opens the visible first transfer', () => {
    const flow = steps('08_transaction_history.yaml');
    const scrolls = stepsOf(flow, 'scrollUntilVisible').filter(
      scroll => (scroll.element as Step)?.id === 'history.end',
    );
    expect(scrolls).toEqual([]);
    expect(stepsOf(flow, 'tapOn').some(tap => tap.id === 'vt-1')).toBe(true);
  });
});
