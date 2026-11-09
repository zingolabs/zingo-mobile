import { RPCMixnetIndicatorEnum } from '@app/walletBackend/RPCMixnetIndicatorEnum';
import { MixnetDirectProbe, directAnswered } from './mixnetDoctorReport';
import { MixnetStatusReport } from './mixnetTransform';

export type MixnetDoctorTone = 'ok' | 'warn' | 'bad' | 'neutral';
export type MixnetDoctorAction = 'none' | 'server' | 'restart';

/** Translation keys under `mixnetdoctor.`, never prose. */
export type MixnetDoctorVerdict = {
  readonly tone: MixnetDoctorTone;
  readonly headlineKey: string;
  readonly detailKey: string;
  readonly action: MixnetDoctorAction;
};

export type MixnetDoctorStepState = 'ok' | 'fail' | 'running' | 'unchecked';

export type MixnetDoctorStep = {
  readonly labelKey: string;
  readonly state: MixnetDoctorStepState;
};

export type MixnetDoctorInput = {
  readonly status: MixnetStatusReport;
  /** The app is connecting: the library reads `died` until the attach lands. */
  readonly attachInFlight: boolean;
  /** `not-run` once the transport has moved on from what it measured. */
  readonly direct: MixnetDirectProbe;
  readonly recentLosses: number;
};

const KEEPS_FAILING_LOSSES = 3;

function isReady(status: MixnetStatusReport): boolean {
  return (
    status.kind === 'status' &&
    status.indicator === RPCMixnetIndicatorEnum.ready
  );
}

/**
 * What the state adds up to and what to do about it. Nothing here measures the
 * tunnel, which the FFI offers no way to do, so "connected" is the wallet's word
 * and the catalog says so.
 *
 * The wallet proves the transport against the selected server, so a dead server
 * reads as a mixnet that never comes up. A direct answer is what tells them apart,
 * which is why that case goes first.
 */
export function mixnetDoctorVerdict(
  input: MixnetDoctorInput,
): MixnetDoctorVerdict {
  const { status, attachInFlight, direct, recentLosses } = input;
  const directFailed = direct.kind !== 'not-run' && !directAnswered(direct);

  if (isReady(status)) {
    if (directFailed) {
      return {
        tone: 'warn',
        headlineKey: 'server-silent',
        detailKey: 'server-silent-ready',
        action: 'server',
      };
    }
    return {
      tone: 'ok',
      headlineKey: 'connected',
      detailKey: recentLosses > 0 ? 'connected-losses' : 'connected-detail',
      action: 'none',
    };
  }
  if (directFailed) {
    return {
      tone: 'bad',
      headlineKey: 'server-silent',
      detailKey: 'server-silent-down',
      action: 'server',
    };
  }
  if (recentLosses >= KEEPS_FAILING_LOSSES) {
    return {
      tone: 'bad',
      headlineKey: 'keeps-failing',
      detailKey: direct.kind === 'not-run' ? 'run-to-check' : 'server-fine',
      /** Restarting would cancel the attach under way and begin the same wait. */
      action: attachInFlight ? 'none' : 'restart',
    };
  }
  if (
    attachInFlight ||
    (status.kind === 'status' &&
      status.indicator === RPCMixnetIndicatorEnum.bootstrapping)
  ) {
    return {
      tone: 'neutral',
      headlineKey: 'connecting',
      detailKey: 'attaching',
      action: 'none',
    };
  }
  return {
    tone: 'bad',
    headlineKey: 'lost',
    detailKey: direct.kind === 'not-run' ? 'run-to-check' : 'server-fine',
    action: 'restart',
  };
}

/**
 * The two questions this screen can honestly answer, in the order they rest on
 * each other. A mixnet that is down because the server is down has no answer of
 * its own, so it reads as not checked rather than as a second failure.
 */
export function mixnetDoctorSteps(
  input: MixnetDoctorInput,
  running: boolean,
): MixnetDoctorStep[] {
  const { status, direct } = input;
  const directFailed = direct.kind !== 'not-run' && !directAnswered(direct);
  const server: MixnetDoctorStepState = running
    ? 'running'
    : direct.kind === 'not-run'
      ? 'unchecked'
      : directFailed
        ? 'fail'
        : 'ok';
  const mixnet: MixnetDoctorStepState = isReady(status)
    ? 'ok'
    : directFailed
      ? 'unchecked'
      : input.attachInFlight
        ? 'running'
        : 'fail';
  return [
    { labelKey: 'step-server', state: server },
    { labelKey: 'step-mixnet', state: mixnet },
  ];
}
