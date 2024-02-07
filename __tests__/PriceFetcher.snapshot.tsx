/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PriceFetcher from '../components/Components/PriceFetcher';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
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
