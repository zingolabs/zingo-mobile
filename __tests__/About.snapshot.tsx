/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import About from '../components/About';
import { ContextLoadedProvider } from '../app/context';

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.useFakeTimers();

// test suite
describe('Component AboutModal - test', () => {
  //snapshot test
  test('AboutModal - snapshot', () => {
    const state = {
      translate: () => [
        '1 text translated line 1',
        '2 text translated line 2',
        '3 text translated line 3',
        '4 text translated line 4',
        '5 text translated line 5',
      ],
      totalBalance: {
        total: 0,
      },
    };
    const about = create(
      <ContextLoadedProvider value={state}>
        <About closeModal={() => {}} />
      </ContextLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
});
