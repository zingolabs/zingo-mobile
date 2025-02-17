/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Send from '../components/Send';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { ModeEnum, CurrencyEnum } from '../app/AppState';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockSendPageState from '../__mocks__/dataMocks/mockSendPageState';

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
      decimalSeparator: '.', // us
      groupingSeparator: ',', // us
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('@react-native-community/netinfo/src/index', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useScrollToTop: jest.fn(),
  useIsFocused: jest.fn(),
  useTheme: () => mockTheme,
}));
jest.mock('react-native-picker-select', () => 'RNPickerSelect');
jest.mock('react-native-device-info', () => ({
  getSystemName: jest.fn(() => 'Mocked System Name'),
  getSystemVersion: jest.fn(() => 'Mocked System Version'),
  getManufacturer: jest.fn(() => 'Mocked Manufacturer'),
  getModel: jest.fn(() => 'Mocked Model'),
}));
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(() => Promise.resolve('mocked clipboard content')),
  setString: jest.fn(),
}));

// test suite
describe('Component Send - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.valueTransfers = mockValueTransfers;
  state.uOrchardAddress = mockAddresses[0].uOrchardAddress;
  state.addresses = mockAddresses;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.zecPrice = mockZecPrice;
  state.totalBalance = mockTotalBalance;
  state.sendPageState = mockSendPageState;
  const onFunction = jest.fn();

  test('Send no currency, privacy normal & mode basic - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.noCurrency;
    // privacy normal
    state.privacy = false;
    // mode basic
    state.mode = ModeEnum.basic;
    const send = render(
      <ContextAppLoadedProvider value={state}>
        <Send
          sendTransaction={onFunction}
          clearToAddr={onFunction}
          toggleMenuDrawer={onFunction}
          setComputingModalVisible={onFunction}
          poolsMoreInfoOnClick={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          setPrivacyOption={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          setScrollToBottom={onFunction}
          setServerOption={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(send.toJSON()).toMatchSnapshot();
  });

  test('Send currency USD, privacy high & mode advanced - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.USDCurrency;
    // privacy normal
    state.privacy = true;
    // mode basic
    state.mode = ModeEnum.advanced;
    const send = render(
      <ContextAppLoadedProvider value={state}>
        <Send
          sendTransaction={onFunction}
          clearToAddr={onFunction}
          toggleMenuDrawer={onFunction}
          setComputingModalVisible={onFunction}
          poolsMoreInfoOnClick={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          setPrivacyOption={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          setScrollToBottom={onFunction}
          setServerOption={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(send.toJSON()).toMatchSnapshot();
  });
});
