/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { Provider } from 'jotai';
import { balanceAtom } from '@app/AppState/balance';
import { polledMockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { seed, storeWith } from '../.storybook/storeWith';
import Header from '@ui/widgets/Header';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { ScreenEnum } from '@app/AppState';

// test suite
describe('Component Header - test', () => {
  //snapshot test
  test('Header Simple - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    const close = jest.fn();
    const about = render(
      <Provider store={storeWith(seed(balanceAtom, polledMockTotalBalance))}>
        <ContextAppLoadedProvider value={state}>
          <Header
            title="title"
            screenName={ScreenEnum.About}
            noBalance={true}
            noSyncingStatus={true}
            noDrawMenu={true}
            noPrivacy={true}
            noUfvkIcon={true}
            closeScreen={close}
          />
        </ContextAppLoadedProvider>
      </Provider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
  test('Header Complex - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    state.info = mockInfo;
    // The price ring renders only for a Nym-consenting session.
    const onFunction = jest.fn();
    const header = render(
      <Provider store={storeWith(seed(balanceAtom, polledMockTotalBalance))}>
        <ContextAppLoadedProvider value={state}>
          <Header
            title="title"
            screenName={ScreenEnum.History}
            testID="valuetransfer text"
            toggleMenuDrawer={onFunction}
            setBackgroundError={onFunction}
            addLastSnackbar={onFunction}
            setShieldingAmount={onFunction}
          />
        </ContextAppLoadedProvider>
      </Provider>,
    );
    expect(header.toJSON()).toMatchSnapshot();
  });
});
