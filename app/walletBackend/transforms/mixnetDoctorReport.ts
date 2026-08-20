import { RPCMixnetIndicatorEnum } from '../enums/RPCMixnetIndicatorEnum';
import {
  MixnetDetailReport,
  MixnetFailure,
  MixnetStatusReport,
} from './mixnetTransform';

/**
 * One gathered Mixnet Doctor run: the environment the probes saw, then the
 * two typed reports the native layer returned, each with the wall-clock it
 * took. Pure input to the renderers below — the screen fills it, the
 * transforms read it, nothing here touches the native surface.
 */
export type MixnetDoctorRun = {
  readonly serverUri: string;
  readonly chainName: string;
  readonly status: MixnetStatusReport;
  readonly statusMillis: number;
  readonly detail: MixnetDetailReport;
  readonly detailMillis: number;
};

/**
 * The stable first line of every report. A support reply can key on it, and
 * a user who copies only one line still names the surface. Deliberately
 * untranslated: the report is a copyable artifact, so every locale pastes
 * the same text.
 */
export const MIXNET_DOCTOR_HEADLINE = 'zingo mixnet doctor report';

/**
 * One typed failure as a single cause line. Exhaustive over every reason, so
 * a new failure arm fails compilation here until it decides what it prints.
 */
export function failureCause(failure: MixnetFailure): string {
  switch (failure.reason) {
    case 'nativeRejection':
      return `native rejection: ${failure.message}`;
    case 'malformedPayload':
      return `malformed payload: ${failure.payload}`;
    case 'unrecognizedIndicator':
      return `unrecognized indicator: ${failure.claimed}`;
    case 'unconsentedOff':
      return 'reported off without this session consent';
  }
}

function statusLine(status: MixnetStatusReport, millis: number): string {
  if (status.kind === 'failure') {
    return `- status probe: FAILED in ${millis} ms — ${failureCause(status.failure)}`;
  }
  const addr =
    status.indicator === RPCMixnetIndicatorEnum.ready &&
    status.socks5Addr !== null
      ? `, socks5 ${status.socks5Addr}`
      : '';
  return `- status probe: ok in ${millis} ms — indicator ${status.indicator}${addr}`;
}

function detailLine(detail: MixnetDetailReport, millis: number): string {
  if (detail.kind === 'failure') {
    return `- bootstrap probe: FAILED in ${millis} ms — ${failureCause(detail.failure)}`;
  }
  const narration =
    detail.detail === '' ? 'no narration' : `"${detail.detail}"`;
  return `- bootstrap probe: ok in ${millis} ms — ${narration}`;
}

/**
 * One row of the on-screen list: a label and its value. Distinct from the
 * copied lines below, whose markdown must stay stable for pasting into an
 * issue.
 */
export type MixnetDoctorRow = {
  readonly label: string;
  readonly value: string;
};

function statusRows(
  status: MixnetStatusReport,
  millis: number,
): MixnetDoctorRow[] {
  if (status.kind === 'failure') {
    return [
      { label: 'Status', value: 'failed' },
      { label: 'Latency', value: `${millis} ms` },
      { label: 'Cause', value: failureCause(status.failure) },
    ];
  }
  const rows: MixnetDoctorRow[] = [
    { label: 'Status', value: 'ok' },
    { label: 'Latency', value: `${millis} ms` },
    { label: 'Indicator', value: status.indicator },
  ];
  if (
    status.indicator === RPCMixnetIndicatorEnum.ready &&
    status.socks5Addr !== null
  ) {
    rows.push({ label: 'Socks5', value: status.socks5Addr });
  }
  return rows;
}

function detailRows(
  detail: MixnetDetailReport,
  millis: number,
): MixnetDoctorRow[] {
  if (detail.kind === 'failure') {
    return [
      { label: 'Bootstrap', value: 'failed' },
      { label: 'Latency', value: `${millis} ms` },
      { label: 'Cause', value: failureCause(detail.failure) },
    ];
  }
  const rows: MixnetDoctorRow[] = [
    { label: 'Bootstrap', value: 'ok' },
    { label: 'Latency', value: `${millis} ms` },
  ];
  if (detail.detail !== '') {
    rows.push({ label: 'Detail', value: detail.detail });
  }
  return rows;
}

/** The run as labelled rows for the screen list, one value per row. */
export function mixnetDoctorRows(run: MixnetDoctorRun): MixnetDoctorRow[] {
  return [
    { label: 'Server', value: run.serverUri },
    { label: 'Chain', value: run.chainName },
    ...statusRows(run.status, run.statusMillis),
    ...detailRows(run.detail, run.detailMillis),
  ];
}

/**
 * The run's body lines, shared by the on-screen rows and the copied markdown
 * so the user pastes exactly what they saw.
 */
export function mixnetDoctorLines(run: MixnetDoctorRun): string[] {
  return [
    `- server: ${run.serverUri}`,
    `- chain: ${run.chainName}`,
    statusLine(run.status, run.statusMillis),
    detailLine(run.detail, run.detailMillis),
  ];
}

/** The whole run as one markdown document, ready to paste into an issue. */
export function mixnetDoctorReport(run: MixnetDoctorRun): string {
  return [`## ${MIXNET_DOCTOR_HEADLINE}`, ...mixnetDoctorLines(run)].join('\n');
}
