import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ChainNameEnum, offlineServer, remoteServer } from '@app/AppState';
import { errorKeyed } from '@app/AppState/types/Result';
import {
  PERMITTED,
  SendPermit,
  SendPermitInputs,
  sendPermit,
  sendWhenPermitted,
} from '@app/walletBackend/transforms/sendPermit';
import { ABSENT_MIXNET_VIEW } from '@app/walletBackend/transforms/mixnetView';
import { mixnetLost, mixnetReady, mockInfo } from '../.storybook/storyMocks';

const online: SendPermitInputs = {
  netInfo: {
    isConnected: true,
    type: NetInfoStateType.wifi,
    isConnectionExpensive: false,
  },
  server: remoteServer(mockInfo.serverUri, ChainNameEnum.mainChainName),
  mixnetView: mixnetReady,
};

describe('sendPermit', () => {
  test('Tests that the permit is granted when the device is connected, the server is remote, and the mixnet view is ready.', () => {
    expect(sendPermit(online)).toEqual(PERMITTED);
  });

  test('Tests that the permit is granted when the platform has no mixnet transport.', () => {
    expect(
      sendPermit({ ...online, mixnetView: ABSENT_MIXNET_VIEW }),
    ).toEqual(PERMITTED);
  });

  test('Tests that the permit is refused with the connection key when the device is disconnected.', () => {
    const disconnected = {
      ...online,
      netInfo: { ...online.netInfo, isConnected: false },
    };
    expect(sendPermit(disconnected)).toEqual(
      errorKeyed('loadedapp.connection-error'),
    );
  });

  test('Tests that the permit is refused with the connection key when the server is offline.', () => {
    const offline = {
      ...online,
      server: offlineServer(ChainNameEnum.mainChainName),
    };
    expect(sendPermit(offline)).toEqual(
      errorKeyed('loadedapp.connection-error'),
    );
  });

  test('Tests that the permit is refused with the mixnet key when the mixnet view blocks sends.', () => {
    expect(sendPermit({ ...online, mixnetView: mixnetLost })).toEqual(
      errorKeyed('send.nym-blocked'),
    );
  });

  test('Tests that the connection key wins when the device is disconnected and the mixnet view blocks sends.', () => {
    const disconnected = {
      ...online,
      netInfo: { ...online.netInfo, isConnected: false },
      mixnetView: mixnetLost,
    };
    expect(sendPermit(disconnected)).toEqual(
      errorKeyed('loadedapp.connection-error'),
    );
  });
});

describe('sendWhenPermitted', () => {
  test('Tests that the send runs and its receipt is returned when the permit is granted.', async () => {
    const send = jest.fn().mockResolvedValue('txid');

    const outcome = await sendWhenPermitted(() => PERMITTED, send);

    expect(outcome).toEqual({ kind: 'sent', receipt: 'txid' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('Tests that the send is skipped and the refusal is returned when the permit is refused.', async () => {
    const send = jest.fn().mockResolvedValue('txid');
    const refusal = errorKeyed('send.nym-blocked');

    const outcome = await sendWhenPermitted(() => refusal, send);

    expect(outcome).toEqual(refusal);
    expect(send).not.toHaveBeenCalled();
  });

  test('Tests that the permit is read at each call when the state changes between two calls.', async () => {
    const send = jest.fn().mockResolvedValue('txid');
    let permit: SendPermit = PERMITTED;
    const permitNow = () => permit;

    await sendWhenPermitted(permitNow, send);
    permit = errorKeyed('send.nym-blocked');
    const second = await sendWhenPermitted(permitNow, send);

    expect(second).toEqual(errorKeyed('send.nym-blocked'));
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('Tests that the rejection of the send propagates when the permit is granted.', async () => {
    const send = jest.fn().mockRejectedValue('Error: server');

    await expect(sendWhenPermitted(() => PERMITTED, send)).rejects.toBe(
      'Error: server',
    );
  });
});
