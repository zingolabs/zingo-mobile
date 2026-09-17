import { MixnetIndicator } from 'zingo-ffi';
import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  mixnetDetail,
  mixnetReport,
  transformMixnetStatus,
  vetPolledStatus,
} from '@app/walletBackend/transforms/mixnetTransform';

describe('transformMixnetStatus', () => {
  test('Tests that ready carries the SOCKS5 address when the wallet reports one', () => {
    expect(
      transformMixnetStatus({
        indicator: MixnetIndicator.Ready,
        socks5Addr: '127.0.0.1:1080',
        bootstrapDetail: undefined,
      }),
    ).toEqual({
      kind: 'status',
      indicator: RPCMixnetIndicatorEnum.ready,
      socks5Addr: '127.0.0.1:1080',
      bootstrapDetail: '',
    });
  });

  test.each([
    [MixnetIndicator.Off, RPCMixnetIndicatorEnum.off],
    [MixnetIndicator.Bootstrapping, RPCMixnetIndicatorEnum.bootstrapping],
    [MixnetIndicator.Died, RPCMixnetIndicatorEnum.died],
  ])(
    'Tests that indicator %s carries no address when the wallet is not ready',
    (indicator, expected) => {
      expect(
        transformMixnetStatus({
          indicator,
          socks5Addr: '127.0.0.1:1080',
          bootstrapDetail: 'attempt 2/10',
        }),
      ).toEqual({
        kind: 'status',
        indicator: expected,
        socks5Addr: undefined,
        bootstrapDetail: 'attempt 2/10',
      });
    },
  );
});

describe('mixnetReport', () => {
  test('Tests that a rejection lands in the failure arm with its error when the call fails', () => {
    expect(
      mixnetReport({
        ok: false,
        error: { tag: 'Host', detail: 'shim missing' },
      }),
    ).toEqual({
      kind: 'failure',
      failure: {
        reason: 'nativeRejection',
        error: { tag: 'Host', detail: 'shim missing' },
      },
    });
  });
});

describe('mixnetDetail', () => {
  test('Tests that the narration line is the quiet state when the wallet reports none', () => {
    expect(
      mixnetDetail({
        kind: 'status',
        indicator: RPCMixnetIndicatorEnum.ready,
        socks5Addr: '127.0.0.1:1',
        bootstrapDetail: '',
      }),
    ).toEqual({ kind: 'detail', detail: '' });
  });

  test('Tests that a failure report carries through when the status call failed', () => {
    const failure = {
      kind: 'failure' as const,
      failure: { reason: 'unconsentedOff' as const },
    };
    expect(mixnetDetail(failure)).toBe(failure);
  });
});

describe('vetPolledStatus', () => {
  test('Tests that a polled off becomes a policy failure when the session holds no consent', () => {
    expect(
      vetPolledStatus(
        {
          kind: 'status',
          indicator: RPCMixnetIndicatorEnum.off,
          socks5Addr: undefined,
          bootstrapDetail: '',
        },
        'none',
      ),
    ).toEqual({ kind: 'failure', failure: { reason: 'unconsentedOff' } });
  });

  test('Tests that a polled off passes through when the user disabled this session', () => {
    const off = {
      kind: 'status' as const,
      indicator: RPCMixnetIndicatorEnum.off,
      socks5Addr: undefined,
      bootstrapDetail: '',
    };
    expect(vetPolledStatus(off, 'disabledThisSession')).toBe(off);
  });
});
