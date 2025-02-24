/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import App from '../App';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));
jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native-tab-view', () => ({
  TabView: '',
  TabBar: '',
}));
jest.mock('react-native-context-menu-view', () => '');
jest.mock('react-native/src/private/animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo/src/index', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
    getValueTransfersList: jest.fn(() => '{ "value_transfers": [], "total": 0 }'),
  };

  return RN;
});
jest.mock('react-native-picker-select', () => 'RNPickerSelect');
jest.mock('react-native-device-info', () => ({
  getSystemName: jest.fn(() => 'Mocked System Name'),
  getSystemVersion: jest.fn(() => 'Mocked System Version'),
  getManufacturer: jest.fn(() => 'Mocked Manufacturer'),
  getModel: jest.fn(() => 'Mocked Model'),
}));
// Jest setup file or in your test file
jest.mock('react-native-gesture-handler/ReanimatedDrawerLayout', () => {
  const R = require('react');

  const ReanimatedDrawerLayout = R.forwardRef((props: any, ref: any) => {
    const { renderNavigationView, children } = props;

    return (
      <div ref={ref}>
        <div>
          {renderNavigationView && renderNavigationView()}
        </div>
        <div>{children}</div>
      </div>
    );
  });

  // Export mock DrawerType if needed
  const DrawerType = {
    FRONT: 'front',
    BACK: 'back',
    SLIDE: 'slide',
  };

  return {
    __esModule: true,
    default: ReanimatedDrawerLayout,
    DrawerType,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNGestureHandlerModule = {
    attachGestureHandler: jest.fn(),
    createGestureHandler: jest.fn(),
    dropGestureHandler: jest.fn(),
    updateGestureHandler: jest.fn(),
    forceTouchAvailable: jest.fn(),
    hasGenericPassword: jest.fn(),
    getSupportedBiometryType: jest.fn(),
    State: {},
    Directions: {},
  };
  return {
    RNGestureHandlerModule: RN,
  };
});
jest.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'biometryCurrentSet',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
  },
  AUTHENTICATION_TYPE: {
    BIOMETRICS: 'biometrics',
  },
  SECURITY_LEVEL: {
    SECURE_SOFTWARE: 'secureSoftware',
  },
  SECURITY_RULES: {
    NONE: 'none',
  },
  STORAGE_TYPE: {
    AES: 'AES',
  },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(() => Promise.resolve('mocked clipboard content')),
  setString: jest.fn(),
}));
jest.mock('@react-navigation/elements', () => ({
  PlatformPressable: jest.fn().mockImplementation(({ children }) => children),
}));

// test suite
describe('Component App - test', () => {
  //snapshot test
  test('App - snapshot', () => {
    const receive = render(<App />);
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
