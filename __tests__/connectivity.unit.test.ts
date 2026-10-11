import { NetInfoStateType } from '@react-native-community/netinfo';
import { connectivity } from '@app/utils/connectivity';
import { ChainNameEnum, offlineServer, remoteServer } from '@app/AppState';

const netInfo = (
  isConnected: boolean | null,
  isInternetReachable?: boolean | null,
) => ({
  isConnected,
  isInternetReachable,
  type: NetInfoStateType.wifi,
  isConnectionExpensive: false,
});

test.each([
  [false, true, 'none'],
  [null, null, 'none'],
  [true, false, 'noAccess'],
  [true, true, 'ok'],
  [true, null, 'ok'],
  [true, undefined, 'ok'],
] as const)(
  'Tests that connected=%p with internet reachable=%p reads as %p',
  (isConnected, isInternetReachable, expected) => {
    expect(connectivity(netInfo(isConnected, isInternetReachable))).toBe(
      expected,
    );
  },
);

const remote = remoteServer(
  'https://zec.rocks:443',
  ChainNameEnum.mainChainName,
);

test('Tests that no server answering on a connected network reads as no internet access', () => {
  expect(
    connectivity({ ...netInfo(true, null), serversUnreachable: true }, remote),
  ).toBe('noAccess');
});

test('Tests that Offline mode shows no internet access warning, only the lack of a network', () => {
  const offline = offlineServer(ChainNameEnum.mainChainName);
  expect(
    connectivity(
      { ...netInfo(true, false), serversUnreachable: true },
      offline,
    ),
  ).toBe('ok');
  expect(connectivity(netInfo(false, false), offline)).toBe('none');
});
