import {
  matchServerProbeOutcome,
  ServerProbeOutcome,
} from '../utils/serverProbeOutcome';

/**
 * One probed target and its typed outcome, in the order the Doctor ran them.
 */
export type DoctorRun = {
  readonly uri: string;
  readonly outcome: ServerProbeOutcome;
};

/**
 * The stable first line of every Doctor report. A support reply can key on
 * it, and a user who copies only one line still identifies the surface.
 */
export const DOCTOR_REPORT_HEADLINE = 'zingo connection doctor report';

function legLine(label: string, leg: { ok: boolean; detail: string; millis: number }): string {
  const verdict = leg.ok ? 'ok' : 'FAILED';
  return `- ${label}: ${verdict} in ${leg.millis} ms — ${leg.detail}`;
}

/**
 * Renders a whole Doctor run as one markdown document, ready to paste into
 * a GitHub issue (the nym-diagnostics plan, Workstream A: the #1221 ask is
 * two of these, NymVPN off then on). Pure and exhaustive over every outcome
 * arm through the handler record, so a new arm fails compilation here until
 * it decides what its report section says.
 */
export function connectionDoctorReport(runs: readonly DoctorRun[]): string {
  const sections = runs.map(run => {
    const body = matchServerProbeOutcome(run.outcome, {
      report: ({ reports }) =>
        reports
          .flatMap(report => {
            const lines = [legLine('clearnet', report.clearnet)];
            lines.push(
              report.mixnet
                ? legLine('mixnet', report.mixnet)
                : '- mixnet: not carried (proxy not ready)',
            );
            return lines;
          })
          .join('\n'),
      ffiRejection: ({ code, message }) =>
        `- probe failed typed: ${code} — ${message}`,
      malformedPayload: ({ detail, payload }) =>
        `- probe payload unusable: ${detail}\n  payload: ${payload}`,
    });
    return `### ${run.uri}\n${body}`;
  });
  return [`## ${DOCTOR_REPORT_HEADLINE}`, ...sections].join('\n\n');
}
