import { NetInfoStateType } from '@react-native-community/netinfo';
import { connectivity } from '@app/utils/connectivity';

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
