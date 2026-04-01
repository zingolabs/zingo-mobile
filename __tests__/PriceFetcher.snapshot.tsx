/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PriceFetcher from '../components/Components/PriceFetcher';
import { ScreenEnum } from '../app/AppState';

// test suite
describe('Component PriceFetcher - test', () => {
  //snapshot test
  test('PriceFetcher - snapshot', () => {
    const setZecPrice = jest.fn();
    const price = render(
      <PriceFetcher
        setZecPrice={setZecPrice}
        screenName={ScreenEnum.Send}
        textBefore="text before"
      />,
    );
    expect(price.toJSON()).toMatchSnapshot();
  });
});
