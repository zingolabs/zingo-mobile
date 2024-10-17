/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadingAppClass } from '../app/LoadingApp';

// Importa el módulo I18n
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { I18n } from 'i18n-js';
import { LanguageEnum, ModeEnum, SelectServerEnum, CurrencyEnum } from '../app/AppState';
import { mockNavigation } from '../__mocks__/dataMocks/mockNavigation';
import { mockRoute } from '../__mocks__/dataMocks/mockRoute';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockBackground } from '../__mocks__/dataMocks/mockBackground';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';

// Crea un mock para el constructor de I18n
jest.mock('i18n-js', () => ({
  __esModule: true,
  I18n: jest.fn().mockImplementation(() => ({
    t: jest.fn(),
    // Agrega otros métodos y propiedades según sea necesario para tus pruebas
  })),
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
jest.mock('react-native-option-menu', () => '');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo', () => {
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
    execute: jest.fn(() => '{}'),
    getLatestBlock: jest.fn(() => '{}'),
    walletExists: jest.fn(() => 'false'),
    getValueTransfersList: jest.fn(() => '{ "value_transfers": [] }'),
    setCryptoDefaultProvider: jest.fn(() => 'true'),
  };

  return RN;
});
jest.mock('react-native-simple-biometrics', () => ({
  requestBioAuth: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(() => Promise.resolve('{}')), // o Promise.reject(new Error('File not found'))
  writeFile: jest.fn(() => Promise.resolve()), // o Promise.reject(new Error('Write failed'))
  // Agrega más funciones mockeadas según sea necesario
}));
jest.mock('react-native-device-info', () => ({
  getSystemName: jest.fn(() => 'Mocked System Name'),
  getSystemVersion: jest.fn(() => 'Mocked System Version'),
  getManufacturer: jest.fn(() => 'Mocked Manufacturer'),
  getModel: jest.fn(() => 'Mocked Model'),
}));
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

// test suite
describe('Component LoadingApp - test', () => {
  //snapshot test
  test('LoadingApp - snapshot', () => {
    const language = LanguageEnum.en;
    const currency = CurrencyEnum.noCurrency;
    const sendAll = false;
    const rescanMenu = false;
    const recoveryWalletInfoOnDevice = true;
    const donation = false;
    const privacy = false;
    const mode = ModeEnum.basic;
    const firstLaunchingMessage = false;
    const toggleTheme = jest.fn();
    const selectServer = SelectServerEnum.auto;
    const donationAlert = false;
    const loadingapp = render(
      <LoadingAppClass
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
        firstLaunchingMessage={firstLaunchingMessage}
        security={mockSecurity}
        selectServer={selectServer}
        donationAlert={donationAlert}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
      />,
    );
    expect(loadingapp.toJSON()).toMatchSnapshot();
  });
});
