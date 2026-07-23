import { RPCMixnetModeEnum } from '../app/walletBackend/enums/RPCMixnetModeEnum';
import {
  hasErrorPrefix,
  parseMixnetMode,
  transformMixnetDetail,
  transformMixnetStatus,
} from '../app/walletBackend/transforms/mixnetTransform';

describe('hasErrorPrefix', () => {
  it('recognizes the native error convention in either case', () => {
    expect(hasErrorPrefix('Error: [Native] attach mixnet: boom')).toBe(true);
    expect(hasErrorPrefix('error: something')).toBe(true);
  });

  it('passes JSON payloads through', () => {
    expect(hasErrorPrefix('{"mixnet_mode":"ready"}')).toBe(false);
    expect(hasErrorPrefix('')).toBe(false);
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
    const nativeReply = JSON.stringify({
      mixnet_mode: 'ready',
      socks5_addr: '127.0.0.1:43210',
    });
    expect(transformMixnetStatus(nativeReply)).toEqual({
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
    const nativeReply = JSON.stringify({
      mixnet_mode: 'died',
      socks5_addr: '127.0.0.1:1',
    });
    expect(transformMixnetStatus(nativeReply)).toEqual({
      kind: 'status',
      mode: RPCMixnetModeEnum.died,
      socks5Addr: null,
    });
  });

  it('lands the native error convention in the error arm', () => {
    const nativeReply = 'Error: [Native] mixnet mode: bridge unavailable';
    expect(transformMixnetStatus(nativeReply)).toEqual({
      kind: 'error',
      message: nativeReply,
    });
  });

  it('lands a payload-level error field in the error arm', () => {
    const nativeReply = JSON.stringify({ error: 'no lightclient' });
    expect(transformMixnetStatus(nativeReply)).toEqual({
      kind: 'error',
      message: 'no lightclient',
    });
  });

  it('lands malformed JSON in the error arm rather than throwing', () => {
    expect(transformMixnetStatus('not json at all').kind).toBe('error');
    expect(transformMixnetStatus('').kind).toBe('error');
  });

  it('lands an unrecognized mode in the error arm', () => {
    const nativeReply = JSON.stringify({ mixnet_mode: 'hibernating' });
    const report = transformMixnetStatus(nativeReply);
    expect(report.kind).toBe('error');
    if (report.kind === 'error') {
      expect(report.message).toContain('hibernating');
    }
  });
});

describe('transformMixnetDetail', () => {
  it('reports the narration line', () => {
    const nativeReply = JSON.stringify({
      detail: 'attempt 2/10: 2 in flight, 0 failed',
    });
    expect(transformMixnetDetail(nativeReply)).toEqual({
      kind: 'detail',
      detail: 'attempt 2/10: 2 in flight, 0 failed',
    });
  });

  it('treats an absent or empty detail as the quiet state, not an error', () => {
    expect(transformMixnetDetail(JSON.stringify({ detail: '' }))).toEqual({
      kind: 'detail',
      detail: '',
    });
    expect(transformMixnetDetail(JSON.stringify({}))).toEqual({
      kind: 'detail',
      detail: '',
    });
  });

  it('lands the native error convention in the error arm', () => {
    const nativeReply = 'Error: [Native] mixnet bootstrap detail: boom';
    expect(transformMixnetDetail(nativeReply)).toEqual({
      kind: 'error',
      message: nativeReply,
    });
  });

  it('lands malformed JSON in the error arm rather than throwing', () => {
    expect(transformMixnetDetail('{{{{').kind).toBe('error');
  });
});
