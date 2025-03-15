/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import App from '../App';

// test suite
describe('Component App - test', () => {
  //snapshot test
  test('App - snapshot', () => {
    const receive = render(<App />);
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
