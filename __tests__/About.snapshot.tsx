/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import About from '../components/About';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';
import { CurrencyNameEnum } from '../app/AppState';

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
    const state = defaultAppStateLoaded;
    state.translate = (p: string) => {
      if (p === 'about.copyright') {
        return String([
          '1 text translated line 1',
          '2 text translated line 2',
          '3 text translated line 3',
          '4 text translated line 4',
          '5 text translated line 5',
        ]);
      } else {
        return 'text translated';
      }
    };
    state.info.currencyName = CurrencyNameEnum.ZEC;
    state.totalBalance.total = 1.25691111;
    const onClose = jest.fn();
    const about = render(
      <ContextAppLoadedProvider value={state}>
        <About closeModal={onClose} />
      </ContextAppLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
});
