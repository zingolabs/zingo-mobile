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

// test suite
describe('Component Header - test', () => {
  //snapshot test
  test('Header Simple - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    const about = render(
      <ContextAppLoadedProvider value={state}>
        <Header title="title" noBalance={true} noSyncingStatus={true} noDrawMenu={true} noPrivacy={true} />
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
          testID="valuetransfer text"
          poolsMoreInfoOnClick={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          toggleMenuDrawer={onFunction}
          setZecPrice={onFunction}
          title="title"
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
