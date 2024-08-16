/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Settings from '../components/Settings';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { LanguageEnum, CurrencyEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockWalletSettings } from '../__mocks__/dataMocks/mockWalletSettings';

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
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo', () => {
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
  };

  return RN;
});
jest.mock('react-native-picker-select', () => 'RNPickerSelect');
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
jest.useFakeTimers();

// test suite
describe('Component Settings - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.server = mockServer;
  state.currency = CurrencyEnum.USDCurrency;
  state.language = LanguageEnum.en;
  state.sendAll = false;
  state.rescanMenu = false;
  state.recoveryWalletInfoOnDevice = true;
  state.donation = false;
  state.walletSettings = mockWalletSettings;
  const onClose = jest.fn();
  const onSetOption = jest.fn();
  test('Settings - snapshot', () => {
    const settings = render(
      <ContextAppLoadedProvider value={state}>
        <Settings
          closeModal={onClose}
          setWalletOption={onSetOption}
          setServerOption={onSetOption}
          setCurrencyOption={onSetOption}
          setLanguageOption={onSetOption}
          setSendAllOption={onSetOption}
          setDonationOption={onSetOption}
          setPrivacyOption={onSetOption}
          setModeOption={onSetOption}
          setSecurityOption={onSetOption}
          setSelectServerOption={onSetOption}
          setRescanMenuOption={onSetOption}
          setRecoveryWalletInfoOnDeviceOption={onSetOption}
        />
      </ContextAppLoadedProvider>,
    );
    expect(settings.toJSON()).toMatchSnapshot();
  });
});
