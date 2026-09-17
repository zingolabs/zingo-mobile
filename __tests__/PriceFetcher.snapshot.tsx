/**
 * @format
 */
jest.mock('@app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn().mockResolvedValue({ price: -1, error: 'refused' }),
}));

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PriceFetcher, { PriceTrafficDriver } from '@ui/widgets/PriceFetcher';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { SelectServerEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';

describe('Component PriceFetcher - test', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.nym = true;
  state.info = mockInfo;
  state.selectServer = SelectServerEnum.auto;
  state.zecPrice = { zecPrice: 33.33, date: 1 };

  test('PriceFetcher - snapshot', () => {
    const price = render(
      <ContextAppLoadedProvider value={state}>
        <PriceTrafficDriver />
        <PriceFetcher />
      </ContextAppLoadedProvider>,
    );
    expect(price.toJSON()).toMatchSnapshot();
  });
});
