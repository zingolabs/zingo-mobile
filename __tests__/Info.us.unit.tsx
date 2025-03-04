/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import Info from '../components/Info';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { CurrencyEnum } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';

// test suite
describe('Component Info - test', () => {
  //unit test
  test('Info - price with us (.) decimal point', () => {
    const state = defaultAppContextLoaded;
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.currency = CurrencyEnum.USDCurrency;
    render(
      <ContextAppLoadedProvider value={state}>
        <Info />
      </ContextAppLoadedProvider>,
    );
    screen.getByText('$ 33.33');
  });
});
