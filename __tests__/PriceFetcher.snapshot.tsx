/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PriceFetcher from '../components/Components/PriceFetcher';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useTheme: () => (mockTheme),
}));

// test suite
describe('Component PriceFetcher - test', () => {
  //snapshot test
  test('PriceFetcher - snapshot', () => {
    const setZecPrice = jest.fn();
    const price = render(<PriceFetcher setZecPrice={setZecPrice} textBefore="text before" />);
    expect(price.toJSON()).toMatchSnapshot();
  });
});
