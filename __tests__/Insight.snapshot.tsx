/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Insight from '../components/Insight';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-svg-charts');
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
describe('Component Insight - test', () => {
  //snapshot test
  test('Insight - snapshot', () => {
    const state = defaultAppStateLoaded;
    state.translate = () => {
      return 'text translated';
    };
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.25691111;
    const onClose = jest.fn();
    const about = render(
      <ContextAppLoadedProvider value={state}>
        <Insight closeModal={onClose} set_privacy_option={onClose} />
      </ContextAppLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
});
