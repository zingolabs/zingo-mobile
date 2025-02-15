/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Header from '../components/Header';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

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
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
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
  };

  return RN;
});

// test suite
describe('Component Header - test', () => {
  //snapshot test
  test('Header Simple - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    const close = jest.fn();
    const about = render(
      <ContextAppLoadedProvider value={state}>
        <Header
          title="title"
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          closeScreen={close}
        />
      </ContextAppLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
  test('Header Complex - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onFunction = jest.fn();
    const header = render(
      <ContextAppLoadedProvider value={state}>
        <Header
          title="title"
          testID="valuetransfer text"
          poolsMoreInfoOnClick={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          toggleMenuDrawer={onFunction}
          setComputingModalVisible={onFunction}
          setBackgroundError={onFunction}
          setPrivacyOption={onFunction}
          setUfvkViewModalVisible={onFunction}
          addLastSnackbar={onFunction}
          setShieldingAmount={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(header.toJSON()).toMatchSnapshot();
  });
});
