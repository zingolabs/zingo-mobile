import { RPCMixnetIndicatorEnum } from '@app/walletBackend/RPCMixnetIndicatorEnum';
import { MixnetJournal } from '@app/walletBackend/MixnetJournal';
import {
  MixnetDirectProbe,
  MixnetDoctorRun,
  mixnetDoctorReport,
  mixnetDoctorRows,
} from '@app/walletBackend/mixnetDoctorReport';
import {
  MixnetDoctorInput,
  mixnetDoctorSteps,
  mixnetDoctorVerdict,
} from '@app/walletBackend/mixnetDoctorVerdict';
import { MixnetStatusReport } from '@app/walletBackend/mixnetTransform';

const status = (indicator: RPCMixnetIndicatorEnum): MixnetStatusReport => ({
  kind: 'status',
  indicator,
  socks5Addr: null,
});

const notRun: MixnetDirectProbe = { kind: 'not-run' };
const answered: MixnetDirectProbe = {
  kind: 'probed',
  probe: {
    outcome: 'verified',
    host: 'zec.rocks',
    port: 443,
    resolved: [],
    literal: false,
    latencyMs: 80,
    chainName: 'main',
    blockHeight: 3_000_000,
    details: '',
  },
};
const silent: MixnetDirectProbe = {
  kind: 'probed',
  probe: {
    outcome: 'noAnswer',
    host: 'zec.rocks',
    port: 443,
    resolved: [],
    literal: false,
    afterSeconds: 20,
  },
};

const input = (over: Partial<MixnetDoctorInput> = {}): MixnetDoctorInput => ({
  status: status(RPCMixnetIndicatorEnum.ready),
  attachInFlight: false,
  direct: notRun,
  recentLosses: 0,
  ...over,
});

const died = status(RPCMixnetIndicatorEnum.died);

describe('the Mixnet Doctor verdict', () => {
  it('Tests that ready reads as connected when nothing contradicts it', () => {
    const verdict = mixnetDoctorVerdict(input());
    expect(verdict.tone).toBe('ok');
    expect(verdict.headlineKey).toBe('connected');
    expect(verdict.action).toBe('none');
  });

  it('Tests that past losses stay a footnote when connected', () => {
    const verdict = mixnetDoctorVerdict(input({ recentLosses: 5 }));
    expect(verdict.headlineKey).toBe('connected');
    expect(verdict.detailKey).toBe('connected-losses');
  });

  it('Tests that a silent server is blamed when the mixnet is down', () => {
    const verdict = mixnetDoctorVerdict(
      input({ status: died, direct: silent }),
    );
    expect(verdict.headlineKey).toBe('server-silent');
    expect(verdict.action).toBe('server');
  });

  it('Tests that a silent server warns about syncing when the mixnet is up', () => {
    const verdict = mixnetDoctorVerdict(input({ direct: silent }));
    expect(verdict.tone).toBe('warn');
    expect(verdict.detailKey).toBe('server-silent-ready');
  });

  it('Tests that the server is cleared when it answers and the mixnet is down', () => {
    const verdict = mixnetDoctorVerdict(
      input({ status: died, direct: answered }),
    );
    expect(verdict.headlineKey).toBe('lost');
    expect(verdict.detailKey).toBe('server-fine');
    expect(verdict.action).toBe('restart');
  });

  it('Tests that nothing is said about the server when it was not asked', () => {
    const verdict = mixnetDoctorVerdict(input({ status: died }));
    expect(verdict.detailKey).toBe('run-to-check');
  });

  it('Tests that a connect in progress is not read as lost', () => {
    const verdict = mixnetDoctorVerdict(
      input({ status: died, attachInFlight: true }),
    );
    expect(verdict.tone).toBe('neutral');
    expect(verdict.headlineKey).toBe('connecting');
  });

  it('Tests that repeated losses show through a connect in progress, with no restart to cancel it', () => {
    const verdict = mixnetDoctorVerdict(
      input({ status: died, attachInFlight: true, recentLosses: 3 }),
    );
    expect(verdict.headlineKey).toBe('keeps-failing');
    expect(verdict.action).toBe('none');
  });
});

describe('the Mixnet Doctor steps', () => {
  const states = (over: Partial<MixnetDoctorInput>, running = false) =>
    mixnetDoctorSteps(input(over), running).map(step => step.state);

  it('Tests that both steps pass when the server answers and the mixnet is up', () => {
    expect(states({ direct: answered })).toEqual(['ok', 'ok']);
  });

  it('Tests that the mixnet is not checked when the server it rests on is silent', () => {
    expect(states({ status: died, direct: silent })).toEqual([
      'fail',
      'unchecked',
    ]);
  });

  it('Tests that the mixnet fails on its own when the server answers', () => {
    expect(states({ status: died, direct: answered })).toEqual(['ok', 'fail']);
  });

  it('Tests that the server step runs while the probe is out', () => {
    expect(states({}, true)[0]).toBe('running');
  });
});

describe('the Mixnet journal', () => {
  it('Tests that losses outside the window do not count', () => {
    const journal = new MixnetJournal();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    journal.note('retry', 'old');
    jest.spyOn(Date, 'now').mockReturnValue(1_000 + 11 * 60 * 1000);
    journal.note('retry', 'new');
    jest.restoreAllMocks();

    expect(journal.recentLosses(1_000 + 11 * 60 * 1000)).toBe(1);
    expect(journal.count('retry')).toBe(2);
  });
});

describe('the Mixnet Doctor report', () => {
  const run: MixnetDoctorRun = {
    serverUri: 'https://zec.rocks:443',
    chainName: 'main',
    status: status(RPCMixnetIndicatorEnum.ready),
    statusMillis: 1,
    detail: { kind: 'detail', detail: '' },
    detailMillis: 1,
    direct: silent,
  };

  it('Tests that the report carries the direct probe and the journal', () => {
    const report = mixnetDoctorReport(run, [
      { atMillis: 0, kind: 'proxy-death', text: 'listener refused' },
    ]);
    expect(report).toContain('direct to server: zec.rocks:443 gave no answer');
    expect(report).toContain('proxy-death: listener refused');
  });

  it('Tests that the rows say so when the direct probe has not run', () => {
    const rows = mixnetDoctorRows({ ...run, direct: notRun });
    expect(rows[rows.length - 1].value).toBe('not run');
  });
});
