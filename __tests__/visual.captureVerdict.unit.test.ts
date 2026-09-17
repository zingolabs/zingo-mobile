import { CAPTURE_STEP, RunJob, captureVerdict } from '../visual/captureVerdict';

const job = (steps: Array<{ name: string; conclusion: string }>): RunJob => ({
  name: 'Visual review',
  conclusion: 'failure',
  steps,
});

describe('captureVerdict', () => {
  test('accepts a run whose gate tripped but whose capture succeeded', () => {
    // The normal accept path: diffs exist, so the Gate step fails the run,
    // yet the bundle is whole. `gh run watch` exit codes cannot make this
    // distinction; the step conclusion can.
    const jobs = [
      job([
        { name: CAPTURE_STEP, conclusion: 'success' },
        { name: 'Diff head vs baseline', conclusion: 'failure' },
        { name: 'Gate', conclusion: 'failure' },
      ]),
    ];

    expect(captureVerdict(jobs)).toEqual({ kind: 'captured' });
  });

  test('rejects a run whose capture step failed', () => {
    // The workflow uploads visual-head with `if: always()`, so a crashed
    // capture still publishes a truncated bundle that must not become the
    // baseline.
    const jobs = [
      job([
        { name: CAPTURE_STEP, conclusion: 'failure' },
        { name: 'Gate', conclusion: 'failure' },
      ]),
    ];

    const verdict = captureVerdict(jobs);
    expect(verdict.kind).toBe('notCaptured');
  });

  test('rejects a run whose capture step was cancelled', () => {
    // `concurrency: cancel-in-progress` kills superseded runs mid-step.
    const jobs = [job([{ name: CAPTURE_STEP, conclusion: 'cancelled' }])];

    const verdict = captureVerdict(jobs);
    expect(verdict.kind).toBe('notCaptured');
  });

  test('rejects a run where the capture step never ran', () => {
    const jobs = [job([{ name: 'Checkout PR head', conclusion: 'failure' }])];

    const verdict = captureVerdict(jobs);
    expect(verdict.kind).toBe('notCaptured');
  });
});
