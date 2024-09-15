/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Messages from '../components/Messages';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { CurrencyEnum, ModeEnum } from '../app/AppState';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';

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
jest.mock('moment', () => {
  // Here we are able to mock chain builder pattern
  const mMoment = {
    format: (p: string) => {
      if (p === 'MMM YYYY') {
        return 'Dec 2022';
      } else if (p === 'YYYY MMM D h:mm a') {
        return '2022 Dec 13 8:00 am';
      } else if (p === 'MMM D, h:mm a') {
        return 'Dec 13, 8:00 am';
      }
    },
  };
  // Here we are able to mock the constructor and to modify instance methods
  const fn = () => {
    return mMoment;
  };
  // Here we are able to mock moment methods that depend on moment not on a moment instance
  fn.locale = jest.fn();
  return fn;
});
jest.mock('moment/locale/es', () => () => ({
  defineLocale: jest.fn(),
}));
jest.mock('moment/locale/pt', () => () => ({
  defineLocale: jest.fn(),
}));
jest.mock('moment/locale/ru', () => () => ({
  defineLocale: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    TouchableOpacity: View,
    Swipeable: View,
  };
});
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
jest.mock('@react-navigation/native', () => ({
  useScrollToTop: jest.fn(),
  useTheme: () => mockTheme,
}));

// test suite
describe('Component Messages - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.valueTransfers = mockValueTransfers;
  state.uaAddress = mockAddresses[0].uaAddress;
  state.addresses = mockAddresses;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  const onFunction = jest.fn();

  test('Messages no currency, privacy normal & mode basic - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.noCurrency;
    // privacy normal
    state.privacy = false;
    // mode basic
    state.mode = ModeEnum.basic;
    const messages = render(
      <ContextAppLoadedProvider value={state}>
        <Messages
          doRefresh={onFunction}
          toggleMenuDrawer={onFunction}
          poolsMoreInfoOnClick={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          setZecPrice={onFunction}
          setComputingModalVisible={onFunction}
          setPrivacyOption={onFunction}
          setSendPageState={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          scrollToTop={false}
        />
      </ContextAppLoadedProvider>,
    );
    expect(messages.toJSON()).toMatchSnapshot();
  });

  test('Messages currency USD, privacy high & mode advanced - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.USDCurrency;
    // privacy normal
    state.privacy = true;
    // mode basic
    state.mode = ModeEnum.advanced;
    const messages = render(
      <ContextAppLoadedProvider value={state}>
        <Messages
          doRefresh={onFunction}
          toggleMenuDrawer={onFunction}
          poolsMoreInfoOnClick={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          setZecPrice={onFunction}
          setComputingModalVisible={onFunction}
          setPrivacyOption={onFunction}
          setSendPageState={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          scrollToTop={false}
        />
      </ContextAppLoadedProvider>,
    );
    expect(messages.toJSON()).toMatchSnapshot();
  });
});
