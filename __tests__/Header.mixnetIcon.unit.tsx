/**
 * @format
 *
 * The mixnet transport now starts in every session, because the price fetch
 * is mixnet-only. Its header icon reports where a send travels, so it belongs
 * to the user's transmit policy: with Mixnet Mode switched off it used to sit
 * there connecting, which reads as the wallet ignoring the setting.
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Header from '@ui/widgets/Header';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { ScreenEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';

const connecting: MixnetView = {
  statusKey: 'mixnet.status.bootstrapping',
  socks5Addr: null,
  narration: null,
  sendBlocked: true,
  recovery: 'wait',
  reconnecting: false,
};

const renderHeader = (nym: boolean) =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: mockTranslate,
        info: mockInfo,
        totalBalance: mockTotalBalance,
        nym,
        mixnetView: connecting,
      }}
    >
      <Header
        title="title"
        screenName={ScreenEnum.History}
        toggleMenuDrawer={jest.fn()}
        setBackgroundError={jest.fn()}
        addLastSnackbar={jest.fn()}
        setShieldingAmount={jest.fn()}
      />
    </ContextAppLoadedProvider>,
  );

describe('Header mixnet icon', () => {
  test('a connecting transport shows while sends go over the mixnet', () => {
    expect(
      renderHeader(true).queryByTestId('header.mixnet-status'),
    ).toBeTruthy();
  });

  test('nothing shows while the user sends over clearnet', () => {
    expect(
      renderHeader(false).queryByTestId('header.mixnet-status'),
    ).toBeNull();
  });
});
