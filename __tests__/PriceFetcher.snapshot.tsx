/**
 * @format
 */
jest.mock('../app/walletBackend', () => ({
  __esModule: true,
  getZecPrice: jest.fn().mockResolvedValue({ price: -1, error: 'refused' }),
}));

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PriceFetcher, {
  PriceTrafficDriver,
} from '../components/Components/PriceFetcher';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { SelectServerEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
// test suite
describe('Component PriceFetcher - test', () => {
  // The ring renders only while the store's surface decision holds, so
  // the driver mounts beside the fetcher exactly as LoadedApp does; the
  // snapshot pins that consented state, not the empty render.
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.nym = true;
  state.info = mockInfo;
  state.selectServer = SelectServerEnum.auto;
  state.zecPrice = { zecPrice: 33.33, date: 1 };
  //snapshot test
  test('PriceFetcher - snapshot', () => {
    const price = render(
      <ContextAppLoadedProvider value={state}>
        <PriceTrafficDriver />
        <PriceFetcher textBefore="text before" />
      </ContextAppLoadedProvider>,
    );
    expect(price.toJSON()).toMatchSnapshot();
  });
});
