/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PriceFetcher from '../components/Components/PriceFetcher';
// test suite
describe('Component PriceFetcher - test', () => {
  //snapshot test
  test('PriceFetcher - snapshot', () => {
    const price = render(<PriceFetcher textBefore="text before" />);
    expect(price.toJSON()).toMatchSnapshot();
  });
});
