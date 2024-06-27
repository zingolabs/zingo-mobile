/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import About from '../components/About';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { infoMock } from './dataMock/infoMock';
import { totalBalanceMock } from './dataMock/totalBalanceMock';
import { translateMock } from './dataMock/translateMock';

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
describe('Component About - test', () => {
  //snapshot test
  test('About - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = translateMock;
    state.info = infoMock;
    state.totalBalance = totalBalanceMock;
    const onClose = jest.fn();
    const about = render(
      <ContextAppLoadedProvider value={state}>
        <About closeModal={onClose} />
      </ContextAppLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
});
