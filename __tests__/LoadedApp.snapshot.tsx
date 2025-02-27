/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadedAppClass } from '../app/LoadedApp';

// Importa el módulo I18n
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { I18n } from 'i18n-js';
import { LanguageEnum, ModeEnum, SelectServerEnum, CurrencyEnum } from '../app/AppState';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockNavigation } from '../__mocks__/dataMocks/mockNavigation';
import { mockRoute } from '../__mocks__/dataMocks/mockRoute';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockBackground } from '../__mocks__/dataMocks/mockBackground';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';

// Crea un mock para el constructor de I18n
jest.mock('i18n-js', () => ({
  __esModule: true,
  I18n: jest.fn().mockImplementation(() => ({
    t: jest.fn(),
    // Agrega otros métodos y propiedades según sea necesario para tus pruebas
  })),
}));

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
  return {
    addEventListener: jest.fn(),
    fetch: jest.fn().mockImplementation(() =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
      }),
    ),
  };
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '[]'),
    getValueTransfersList: jest.fn(() => '{ "value_transfers": [], "total": 0 }'),
  };

  return RN;
});
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(() => Promise.resolve('{}')), // o Promise.reject(new Error('File not found'))
  writeFile: jest.fn(() => Promise.resolve()), // o Promise.reject(new Error('Write failed'))
  // Agrega más funciones mockeadas según sea necesario
}));
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
    GestureHandlerRootView: ({ children }: {children: React.ReactNode}) => children,
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
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useTheme: () => (mockTheme),
}));

// test suite
describe('Component LoadedApp - test', () => {
  //snapshot test
  test('LoadedApp - snapshot', () => {
    const language = LanguageEnum.en;
    const currency = CurrencyEnum.noCurrency;
    const sendAll = false;
    const rescanMenu = false;
    const recoveryWalletInfoOnDevice = true;
    const donation = false;
    const privacy = false;
    const mode = ModeEnum.basic;
    const readOnly = false;
    const toggleTheme = jest.fn();
    const selectServer = SelectServerEnum.auto;
    const zenniesDonationAddress = 'xxxxxxxxxxxxxxxxx';
    const loadedapp = render(
      <LoadedAppClass
        navigation={mockNavigation}
        route={mockRoute}
        toggleTheme={toggleTheme}
        translate={mockTranslate}
        theme={mockTheme}
        language={language}
        currency={currency}
        server={mockServer}
        sendAll={sendAll}
        donation={donation}
        privacy={privacy}
        mode={mode}
        background={mockBackground}
        readOnly={readOnly}
        addressBook={mockAddressBook}
        security={mockSecurity}
        selectServer={selectServer}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
        zenniesDonationAddress={zenniesDonationAddress}
      />,
    );
    expect(loadedapp.toJSON()).toMatchSnapshot();
  });
});
