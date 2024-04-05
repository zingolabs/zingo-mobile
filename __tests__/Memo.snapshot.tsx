/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Memo from '../components/Memo';
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
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});

// test suite
describe('Component Memo - test', () => {
  //snapshot test
  test('Memo - snapshot', () => {
    const state = defaultAppStateLoaded;
    state.translate = () => 'translated text';
    state.sendPageState.toaddr.memo = 'memo1\nmemo2\nmemo3\nmemo4\nmemo5\nmemo6\nmemo7\nmemo8\nmemo9\nmemo10';
    const onClose = jest.fn();
    const memo = render(
      <ContextAppLoadedProvider value={state}>
        <Memo closeModal={onClose} updateToField={onClose} />
      </ContextAppLoadedProvider>,
    );
    expect(memo.toJSON()).toMatchSnapshot();
  });
});
