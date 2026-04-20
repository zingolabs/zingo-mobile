const RN = jest.requireActual('react-native');

export const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  cellular: 'cellular',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
};

RN.NativeModules.RNCNetInfo = {
  execute: jest.fn(() => '{}'),
};

export default {
  RNCNetInfo: RN,
  addEventListener: jest.fn(),
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
    }),
  ),
};
