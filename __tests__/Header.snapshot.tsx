/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Header from '../components/Header';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';

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

// test suite
describe('Component Header - test', () => {
  //snapshot test
  test('Header Simple - snapshot', () => {
    const state = defaultAppStateLoaded;
    state.translate = () => 'text translated';
    const about = render(
      <ContextAppLoadedProvider value={state}>
        <Header title="title" noBalance={true} noSyncingStatus={true} noDrawMenu={true} noPrivacy={true} />
      </ContextAppLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
  test('Header Complex - snapshot', () => {
    const state = defaultAppStateLoaded;
    state.translate = () => 'text translated';
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const onFunction = jest.fn();
    const header = render(
      <ContextAppLoadedProvider value={state}>
        <Header
          testID="transaction text"
          toggleMenuDrawer={onFunction}
          setZecPrice={onFunction}
          title="title"
          setComputingModalVisible={onFunction}
          setBackgroundError={onFunction}
          set_privacy_option={onFunction}
          setPoolsToShieldSelectSapling={onFunction}
          setPoolsToShieldSelectTransparent={onFunction}
          setUfvkViewModalVisible={onFunction}
          addLastSnackbar={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(header.toJSON()).toMatchSnapshot();
  });
});
