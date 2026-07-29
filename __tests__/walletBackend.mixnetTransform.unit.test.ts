import { RPCMixnetModeEnum } from '../app/walletBackend/enums/RPCMixnetModeEnum';
import {
  describeRejection,
  parseMixnetMode,
  transformMixnetDetail,
  transformMixnetStatus,
} from '../app/walletBackend/transforms/mixnetTransform';

describe('describeRejection', () => {
  it('carries an Error message from the error channel', () => {
    expect(describeRejection(new Error('attach_mixnet: endpoint dead'))).toEqual(
      {
        reason: 'nativeRejection',
        message: 'attach_mixnet: endpoint dead',
      },
    );
  });

  it('stringifies non-Error throwables without throwing itself', () => {
    expect(describeRejection('bridge gone')).toEqual({
      reason: 'nativeRejection',
      message: 'bridge gone',
    });
    expect(describeRejection(undefined)).toEqual({
      reason: 'nativeRejection',
      message: 'unknown',
    });
  });
});

describe('parseMixnetMode', () => {
  it('accepts each of the four modes exactly', () => {
    expect(parseMixnetMode('off')).toBe(RPCMixnetModeEnum.off);
    expect(parseMixnetMode('bootstrapping')).toBe(
      RPCMixnetModeEnum.bootstrapping,
    );
    expect(parseMixnetMode('ready')).toBe(RPCMixnetModeEnum.ready);
    expect(parseMixnetMode('died')).toBe(RPCMixnetModeEnum.died);
  });

  it('rejects anything that is not exactly a mode string', () => {
    expect(parseMixnetMode('READY')).toBeNull();
    expect(parseMixnetMode('offline')).toBeNull();
    expect(parseMixnetMode('')).toBeNull();
    expect(parseMixnetMode(undefined)).toBeNull();
    expect(parseMixnetMode(3)).toBeNull();
    expect(parseMixnetMode({ mode: 'ready' })).toBeNull();
  });
});

describe('transformMixnetStatus', () => {
  it('reports ready with the SOCKS5 address', () => {
    const dataReply = JSON.stringify({
      mixnet_mode: 'ready',
      socks5_addr: '127.0.0.1:43210',
    });
    expect(transformMixnetStatus(dataReply)).toEqual({
      kind: 'status',
      mode: RPCMixnetModeEnum.ready,
      socks5Addr: '127.0.0.1:43210',
    });
  });

  it('reports every non-ready mode with a null address', () => {
    const nonReadyModes: readonly RPCMixnetModeEnum[] = [
      RPCMixnetModeEnum.off,
      RPCMixnetModeEnum.bootstrapping,
      RPCMixnetModeEnum.died,
    ];
    for (const mode of nonReadyModes) {
      expect(
        transformMixnetStatus(JSON.stringify({ mixnet_mode: mode })),
      ).toEqual({ kind: 'status', mode, socks5Addr: null });
    }
  });

  it('never surfaces a stale address outside of ready', () => {
    // A died payload must not carry a dialable address even if one leaks in.
    const dataReply = JSON.stringify({
      mixnet_mode: 'died',
      socks5_addr: '127.0.0.1:1',
    });
    expect(transformMixnetStatus(dataReply)).toEqual({
      kind: 'status',
      mode: RPCMixnetModeEnum.died,
      socks5Addr: null,
    });
  });

  it('treats error prose in the data channel as a malformed payload, never as an error signal', () => {
    // The channel-purity contract (audit Issues Q and R): the data channel
    // is never sniffed for prefixes, so a leaked "Error: ..." string is
    // simply not a status payload.
    const leakedProse = 'Error: [Native] mixnet mode: something';
    expect(transformMixnetStatus(leakedProse)).toEqual({
      kind: 'failure',
      failure: { reason: 'malformedPayload', payload: leakedProse },
    });
  });

  it('lands malformed JSON in the failure arm rather than throwing', () => {
    expect(transformMixnetStatus('not json at all').kind).toBe('failure');
    expect(transformMixnetStatus('').kind).toBe('failure');
  });

  it('lands an unrecognized mode in the failure arm', () => {
    const dataReply = JSON.stringify({ mixnet_mode: 'hibernating' });
    expect(transformMixnetStatus(dataReply)).toEqual({
      kind: 'failure',
      failure: { reason: 'unrecognizedMode', claimed: 'hibernating' },
    });
  });
});

describe('transformMixnetDetail', () => {
  it('reports the narration line', () => {
    const dataReply = JSON.stringify({
      detail: 'attempt 2/10: 2 in flight, 0 failed',
    });
    expect(transformMixnetDetail(dataReply)).toEqual({
      kind: 'detail',
      detail: 'attempt 2/10: 2 in flight, 0 failed',
    });
  });

  it('treats an absent or empty detail as the quiet state, not a failure', () => {
    expect(transformMixnetDetail(JSON.stringify({ detail: '' }))).toEqual({
      kind: 'detail',
      detail: '',
    });
    expect(transformMixnetDetail(JSON.stringify({}))).toEqual({
      kind: 'detail',
      detail: '',
    });
  });

  it('lands malformed JSON in the failure arm rather than throwing', () => {
    expect(transformMixnetDetail('{{{{').kind).toBe('failure');
  });
});
