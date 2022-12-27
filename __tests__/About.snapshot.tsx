/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import About from '../components/About';
import { defaultAppStateLoaded, ContextLoadedProvider } from '../app/context';

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
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.25691111;
    const onClose = jest.fn();
    const about = render(
      <ContextLoadedProvider value={state}>
        <About closeModal={onClose} />
      </ContextLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
});
