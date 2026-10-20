import { errorKeyed } from '@app/AppState/types/Result';
import {
  computingEnd,
  settleSend,
  shieldEnd,
} from '@app/walletBackend/transforms/sendSettlement';

const sent = { kind: 'sent', receipt: 'txid' };
const refusal = errorKeyed('send.nym-blocked');
const serverError = 'Error: server unreachable';
const dust = '64: dust';

describe('settleSend', () => {
  test('Tests that the send settles as sent when the first attempt sends.', async () => {
    const attempt = jest.fn().mockResolvedValue(sent);
    const switchServer = jest.fn();

    const settlement = await settleSend(attempt, switchServer, true);

    expect(settlement).toEqual({ kind: 'sent' });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(switchServer).not.toHaveBeenCalled();
  });

  test('Tests that the send settles as the refusal when the permit refuses the first attempt.', async () => {
    const attempt = jest.fn().mockResolvedValue(refusal);
    const switchServer = jest.fn();

    const settlement = await settleSend(attempt, switchServer, true);

    expect(settlement).toEqual(refusal);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(switchServer).not.toHaveBeenCalled();
  });

  test('Tests that the send settles as the failure with one attempt when the backend rejects with a failure of the wallet.', async () => {
    const attempt = jest.fn().mockRejectedValue(dust);
    const switchServer = jest.fn();

    const settlement = await settleSend(attempt, switchServer, true);

    expect(settlement).toEqual(errorKeyed('send.dust-error'));
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(switchServer).not.toHaveBeenCalled();
  });

  test('Tests that the send settles as the failure with one attempt when the backend rejects with a server failure and a switch is disallowed.', async () => {
    const attempt = jest.fn().mockRejectedValue(serverError);
    const switchServer = jest.fn();

    const settlement = await settleSend(attempt, switchServer, false);

    expect(settlement).toEqual({ kind: 'verbatim', text: serverError });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(switchServer).not.toHaveBeenCalled();
  });

  test('Tests that the server switch runs between the two attempts when the backend rejects the first attempt with a server failure.', async () => {
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce(sent);
    const switchServer = jest.fn().mockResolvedValue(undefined);

    const settlement = await settleSend(attempt, switchServer, true);

    expect(settlement).toEqual({ kind: 'sent' });
    expect(attempt.mock.invocationCallOrder[0]).toBeLessThan(
      switchServer.mock.invocationCallOrder[0],
    );
    expect(switchServer.mock.invocationCallOrder[0]).toBeLessThan(
      attempt.mock.invocationCallOrder[1],
    );
  });

  test('Tests that the send settles as the refusal when the permit refuses the second attempt.', async () => {
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce(refusal);

    const settlement = await settleSend(attempt, jest.fn(), true);

    expect(settlement).toEqual(refusal);
  });

  test('Tests that the send settles as the second failure when the backend rejects both attempts.', async () => {
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(dust);

    const settlement = await settleSend(attempt, jest.fn(), true);

    expect(settlement).toEqual(errorKeyed('send.dust-error'));
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});

describe('computingEnd', () => {
  test('Tests that the end is the created phase when the settlement is sent.', () => {
    expect(computingEnd({ kind: 'sent' })).toEqual({ phase: 'created' });
  });

  test('Tests that the end is the failed phase with the failure when the settlement is a failure.', () => {
    expect(computingEnd(refusal)).toEqual({
      phase: 'failed',
      failure: refusal,
    });
  });
});

describe('shieldEnd', () => {
  const failed = (text: string) => ({
    phase: 'failed',
    failure: { kind: 'verbatim', text },
  });

  test('Tests that the end is the created phase when the shield returns transaction ids.', () => {
    expect(shieldEnd({ ok: true, value: '{"txids":["txid"]}' })).toEqual({
      phase: 'created',
    });
  });

  test('Tests that the end is the failed phase with the error when the shield returns an error field.', () => {
    expect(shieldEnd({ ok: true, value: '{"error":"no funds"}' })).toEqual(
      failed('no funds'),
    );
  });

  test('Tests that the end is the failed phase with the message when the bridge call fails.', () => {
    const shield = {
      ok: false as const,
      error: { code: 'Unknown' as const, message: 'bridge failed' },
    };

    expect(shieldEnd(shield)).toEqual(failed('bridge failed'));
  });

  test('Tests that the end is the failed phase with no failure when the shield returns neither transaction ids nor an error.', () => {
    expect(shieldEnd({ ok: true, value: '{}' })).toEqual({ phase: 'failed' });
  });

  test('Tests that the end is the created phase when the shield returns a payload that is not JSON.', () => {
    expect(shieldEnd({ ok: true, value: 'txid' })).toEqual({
      phase: 'created',
    });
  });
});
