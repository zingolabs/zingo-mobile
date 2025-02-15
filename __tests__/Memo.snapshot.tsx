/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Memo from '../components/Memo';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

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
describe('Component Memo - test', () => {
  //snapshot test
  test('Memo - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    const onClose = jest.fn();
    const onSetMemo = jest.fn();
    const memo = render(
      <ContextAppLoadedProvider value={state}>
        <Memo closeModal={onClose} message={''} includeUAMessage={true} setMessage={onSetMemo} />
      </ContextAppLoadedProvider>,
    );
    expect(memo.toJSON()).toMatchSnapshot();
  });
});
