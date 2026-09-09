// Decides from a completed run's jobs whether the "Capture PR head" step
// produced a whole visual-head bundle. The run's own conclusion cannot say:
// the Gate step trips on any visual diff, so the run concludes `failure` on
// exactly the normal accept path, while the workflow uploads the bundle with
// `if: always()`, so a crashed capture still publishes a partial one.

export const CAPTURE_STEP = 'Capture PR head';

export type RunStep = { name: string; conclusion: string };
export type RunJob = { name: string; conclusion: string; steps: RunStep[] };

export type CaptureVerdict =
  { kind: 'captured' } | { kind: 'notCaptured'; reason: string };

// The capture step must have run and concluded `success`; anything else means
// the visual-head artifact is missing or truncated.
export function captureVerdict(jobs: RunJob[]): CaptureVerdict {
  const capture = jobs
    .flatMap(job => job.steps)
    .find(step => step.name === CAPTURE_STEP);
  if (capture === undefined) {
    return {
      kind: 'notCaptured',
      reason: `no "${CAPTURE_STEP}" step ran: there is no capture to accept.`,
    };
  }
  if (capture.conclusion !== 'success') {
    return {
      kind: 'notCaptured',
      reason:
        `"${CAPTURE_STEP}" concluded ${capture.conclusion}: ` +
        'the visual-head bundle is not trustworthy.',
    };
  }
  return { kind: 'captured' };
}
