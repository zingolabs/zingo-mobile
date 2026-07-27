import {
  matchServerProbeOutcome,
  matchSyncProbeOutcome,
  ProbeFailure,
  ProbeLeg,
  ServerProbeOutcome,
  SyncProbeOutcome,
} from '../utils/serverProbeOutcome';

/**
 * One probed target in the order the Doctor ran them: the staged sync-path
 * probe always runs; the paired covered-surface probe runs for the current
 * server only, so its absence here is structural, not a missing value.
 */
export type DoctorRun =
  | {
      readonly kind: 'stockServer';
      readonly uri: string;
      readonly sync: SyncProbeOutcome;
    }
  | {
      readonly kind: 'currentServer';
      readonly uri: string;
      readonly sync: SyncProbeOutcome;
      readonly paired: ServerProbeOutcome;
    };

/**
 * The stable first line of every Doctor report. A support reply can key on
 * it, and a user who copies only one line still identifies the surface.
 */
export const DOCTOR_REPORT_HEADLINE = 'zingo connection doctor report';

function failureLines(failure: ProbeFailure): string[] {
  return [
    `failed at ${failure.stage} to ${failure.target}`,
    ...failure.causeChain.map(cause => `  - ${cause}`),
  ];
}

function legLines(label: string, leg: ProbeLeg): string[] {
  switch (leg.outcome.kind) {
    case 'answered': {
      const { chain, height } = leg.outcome.info;
      return [
        `- ${label}: ok in ${leg.millis} ms — chain ${chain}, height ${height}`,
      ];
    }
    case 'failed': {
      const [head, ...causes] = failureLines(leg.outcome.failure);
      return [`- ${label}: FAILED in ${leg.millis} ms — ${head}`, ...causes];
    }
  }
}

function syncLines(outcome: SyncProbeOutcome): string[] {
  return matchSyncProbeOutcome(outcome, {
    staged: ({ probe }) => {
      const lines = probe.stages.flatMap(stage => {
        switch (stage.outcome.kind) {
          case 'passed':
            return [`- ${stage.step}: ok in ${stage.millis} ms`];
          case 'failed': {
            const [head, ...causes] = failureLines(stage.outcome.failure);
            return [
              `- ${stage.step}: FAILED in ${stage.millis} ms — ${head}`,
              ...causes,
            ];
          }
        }
      });
      if (probe.verdict.kind === 'reachable') {
        const { chain, height } = probe.verdict.info;
        lines.push(`- serving chain ${chain} at height ${height}`);
      }
      return lines;
    },
    ffiRejection: ({ code, message }) => [
      `- probe failed typed: ${code} — ${message}`,
    ],
    malformedPayload: ({ detail, payload }) => [
      `- probe payload unusable: ${detail}`,
      `  payload: ${payload}`,
    ],
  });
}

function pairedLines(outcome: ServerProbeOutcome): string[] {
  return matchServerProbeOutcome(outcome, {
    report: ({ reports }) =>
      reports.flatMap(report => [
        ...legLines('clearnet', report.clearnet),
        ...(report.mixnet.kind === 'probed'
          ? legLines('mixnet', report.mixnet.leg)
          : ['- mixnet: not carried (proxy not ready)']),
      ]),
    ffiRejection: ({ code, message }) => [
      `- probe failed typed: ${code} — ${message}`,
    ],
    malformedPayload: ({ detail, payload }) => [
      `- probe payload unusable: ${detail}`,
      `  payload: ${payload}`,
    ],
  });
}

/**
 * One run's report lines, shared by the markdown document and the Doctor
 * screen's rows so the user copies exactly what they saw.
 */
export function doctorRunLines(run: DoctorRun): string[] {
  const lines = syncLines(run.sync);
  if (run.kind === 'currentServer') {
    lines.push('covered-surface probe (paired):');
    lines.push(...pairedLines(run.paired));
  }
  return lines;
}

/**
 * Renders a whole Doctor run as one markdown document, ready to paste into
 * a GitHub issue (the nym-diagnostics plan, Workstream A: the #1221 ask is
 * two of these, NymVPN off then on). Pure and exhaustive over every outcome
 * arm through the handler records, so a new arm fails compilation here
 * until it decides what its report section says.
 */
export function connectionDoctorReport(runs: readonly DoctorRun[]): string {
  const sections = runs.map(
    run => `### ${run.uri}\n${doctorRunLines(run).join('\n')}`,
  );
  return [`## ${DOCTOR_REPORT_HEADLINE}`, ...sections].join('\n\n');
}
