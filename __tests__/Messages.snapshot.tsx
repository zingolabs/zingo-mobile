/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { Messages } from '../components/Messages';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { CurrencyEnum, ModeEnum } from '../app/AppState';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';

// test suite
describe('Component Messages - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.valueTransfers = mockValueTransfers;
  state.uOrchardAddress = mockAddresses[0].uOrchardAddress;
  state.addresses = mockAddresses;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  const onFunction = jest.fn();

  test('Messages no currency, privacy normal & mode basic - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.noCurrency;
    // privacy normal
    state.privacy = false;
    // mode basic
    state.mode = ModeEnum.basic;
    const messages = render(
      <ContextAppLoadedProvider value={state}>
        <Messages
          toggleMenuDrawer={onFunction}
          setPrivacyOption={onFunction}
          setScrollToBottom={onFunction}
          scrollToBottom={false}
          setScrollToTop={onFunction}
          scrollToTop={false}
          sendTransaction={onFunction}
          setServerOption={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(messages.toJSON()).toMatchSnapshot();
  });

  test('Messages currency USD, privacy high & mode advanced - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.USDCurrency;
    // privacy normal
    state.privacy = true;
    // mode basic
    state.mode = ModeEnum.advanced;
    const messages = render(
      <ContextAppLoadedProvider value={state}>
        <Messages
          toggleMenuDrawer={onFunction}
          setPrivacyOption={onFunction}
          setScrollToBottom={onFunction}
          scrollToBottom={false}
          setScrollToTop={onFunction}
          scrollToTop={false}
          sendTransaction={onFunction}
          setServerOption={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(messages.toJSON()).toMatchSnapshot();
  });
});
