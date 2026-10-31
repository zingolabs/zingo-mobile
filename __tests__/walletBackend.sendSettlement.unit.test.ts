import { errorKeyed } from '@app/AppState/types/Result';
import {
  computingEnd,
  sendStage,
  settleSend,
  shieldEnd,
} from '@app/walletBackend/transforms/sendSettlement';

const sent = { kind: 'sent', receipt: 'txid' };
const refusal = errorKeyed('send.nym-blocked');
const serverError = 'Error: server unreachable';
const dust = 'Error: send: Transmission error.: Transmission failed. 64: dust';
const unreached =
  'Error: send: Transmission error.: Transmission failed. connection reset';
const NOW = 1_700_000_000;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const failed = (
  failure: object,
  stage: 'create' | 'send' | 'rejected',
): object => ({ kind: 'failed', failure, stage, since: NOW });

describe('sendStage', () => {
  test('Tests that a send failed while creating when the error is not a transmission error.', () => {
    expect(
      sendStage('Error: send: Failed to construct sending transaction.'),
    ).toBe('create');
  });

  test('Tests that a send failed while sending when the transmission failed without a reject code.', () => {
    expect(sendStage(unreached)).toBe('send');
  });

  test('Tests that a send was rejected when the transmission failed with a node reject code.', () => {
    expect(sendStage(dust)).toBe('rejected');
  });
});

describe('settleSend', () => {
  test('Tests that a send in two steps settles with both txids, the hop first, when the receipt lists two.', async () => {
    const attempt = jest
      .fn()
      .mockResolvedValue({ kind: 'sent', receipt: 'hop, payment' });

    const settlement = await settleSend(attempt, jest.fn(), true);

    expect(settlement).toEqual({ kind: 'sent', txids: ['hop', 'payment'] });
  });

  test('Tests that the send settles as sent when the first attempt sends.', async () => {
    const attempt = jest.fn().mockResolvedValue(sent);
    const switchServer = jest.fn();

    const settlement = await settleSend(attempt, switchServer, true);

    expect(settlement).toEqual({ kind: 'sent', txids: ['txid'] });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(switchServer).not.toHaveBeenCalled();
  });

  test('Tests that the send settles as the refusal, failed while creating, when the permit refuses the first attempt.', async () => {
    const attempt = jest.fn().mockResolvedValue(refusal);
    const switchServer = jest.fn();

    const settlement = await settleSend(attempt, switchServer, true);

    expect(settlement).toEqual(failed(refusal, 'create'));
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(switchServer).not.toHaveBeenCalled();
  });

  test('Tests that the send settles as rejected with one attempt when the node rejects it.', async () => {
    const attempt = jest.fn().mockRejectedValue(dust);
    const switchServer = jest.fn();

    const settlement = await settleSend(attempt, switchServer, true);

    expect(settlement).toEqual(
      failed(errorKeyed('send.dust-error'), 'rejected'),
    );
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(switchServer).not.toHaveBeenCalled();
  });

  test('Tests that the send settles as the failure with one attempt when the backend rejects with a server failure and a switch is disallowed.', async () => {
    const attempt = jest.fn().mockRejectedValue(serverError);
    const switchServer = jest.fn();

    const settlement = await settleSend(attempt, switchServer, false);

    expect(settlement).toEqual(
      failed({ kind: 'verbatim', text: serverError }, 'create'),
    );
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

    expect(settlement).toEqual({ kind: 'sent', txids: ['txid'] });
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

    expect(settlement).toEqual(failed(refusal, 'create'));
  });

  test('Tests that the send settles as the second failure, since the second attempt, when the backend rejects both attempts.', async () => {
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(serverError)
      .mockImplementationOnce(() => {
        (Date.now as jest.Mock).mockReturnValue((NOW + 5) * 1000);
        return Promise.reject(unreached);
      });

    const settlement = await settleSend(
      attempt,
      jest.fn().mockImplementation(async () => {
        (Date.now as jest.Mock).mockReturnValue((NOW + 3) * 1000);
      }),
      true,
    );

    expect(settlement).toEqual({
      kind: 'failed',
      failure: { kind: 'verbatim', text: unreached },
      stage: 'send',
      since: NOW + 3,
    });
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});

describe('computingEnd', () => {
  test('Tests that the end is the created phase with the txids when the settlement is sent.', () => {
    expect(computingEnd({ kind: 'sent', txids: ['a', 'b'] })).toEqual({
      phase: 'created',
      txids: ['a', 'b'],
    });
  });

  test('Tests that the end is the failed phase with the failure, its stage and its start when the settlement is a failure.', () => {
    expect(
      computingEnd({
        kind: 'failed',
        failure: refusal,
        stage: 'create',
        since: NOW,
      }),
    ).toEqual({
      phase: 'failed',
      failure: refusal,
      stage: 'create',
      since: NOW,
    });
  });
});

describe('shieldEnd', () => {
  const shieldFailed = (text: string, stage = 'create') => ({
    phase: 'failed',
    failure: { kind: 'verbatim', text },
    stage,
    since: NOW,
  });

  test('Tests that the end is the created phase with every transaction id when the shield returns transaction ids.', () => {
    expect(
      shieldEnd({ ok: true, value: '{"txids":["first","shield"]}' }, NOW),
    ).toEqual({ phase: 'created', txids: ['first', 'shield'] });
  });

  test('Tests that the end is the created phase with no ids when the shield returns an empty list.', () => {
    expect(shieldEnd({ ok: true, value: '{"txids":[]}' }, NOW)).toEqual({
      phase: 'created',
      txids: [],
    });
  });

  test('Tests that the end is the failed phase with the error when the shield returns an error field.', () => {
    expect(shieldEnd({ ok: true, value: '{"error":"no funds"}' }, NOW)).toEqual(
      shieldFailed('no funds'),
    );
  });

  test('Tests that the end is the failed phase with the message, failed while sending, when the transmission fails.', () => {
    const shield = {
      ok: false as const,
      error: { code: 'Send' as const, message: unreached },
    };

    expect(shieldEnd(shield, NOW)).toEqual(shieldFailed(unreached, 'send'));
  });

  test('Tests that the end is the failed phase with no failure when the shield returns neither transaction ids nor an error.', () => {
    expect(shieldEnd({ ok: true, value: '{}' }, NOW)).toEqual({
      phase: 'failed',
      stage: 'create',
      since: NOW,
    });
  });

  test('Tests that the end is the created phase with no ids when the shield returns a payload that is not JSON.', () => {
    expect(shieldEnd({ ok: true, value: 'txid' }, NOW)).toEqual({
      phase: 'created',
      txids: [],
    });
  });
});
