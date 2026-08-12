/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import History from '../screens/History';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { InfoType, RouteEnum, TotalBalanceClass } from '../app/AppState';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.History
> {
  return {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.History, params: undefined },
  };
}

// Chain tip past NU6.3 unless a test says otherwise.
const activeInfo = {
  ...mockInfo,
  latestBlock: mockInfo.ironwoodActivationHeight as number,
} as InfoType;

function renderHistory(overrides: {
  info?: InfoType;
  totalBalance?: TotalBalanceClass;
  readOnly?: boolean;
}) {
  const state = {
    ...defaultAppContextLoaded,
    valueTransfers: mockValueTransfers,
    addresses: mockAddresses,
    translate: mockTranslate,
    info: overrides.info ?? activeInfo,
    totalBalance: overrides.totalBalance ?? mockTotalBalance,
    readOnly: overrides.readOnly ?? false,
  };
  const props = makeDrawerProps();
  const onFunction = jest.fn();
  return render(
    <ContextAppLoadedProvider value={state}>
      <History
        {...props}
        toggleMenuDrawer={onFunction}
        setShieldingAmount={onFunction}
        setScrollToTop={onFunction}
        scrollToTop={false}
        setScrollToBottom={onFunction}
      />
    </ContextAppLoadedProvider>,
  );
}

const withOrchard = (confirmedOrchardBalance: number): TotalBalanceClass => ({
  ...mockTotalBalance,
  confirmedOrchardBalance,
});

describe('Ironwood migration banner visibility', () => {
  test('shows while spendable orchard funds remain', () => {
    const { queryByTestId } = renderHistory({
      totalBalance: withOrchard(0.3),
    });

    expect(queryByTestId('ironwoodbanner.start')).not.toBeNull();
  });

  test('is the only gate: onboarding having been seen does not hide it', () => {
    // The banner reads no settings at all — `ironwoodOnboardSeen` gates only
    // the auto-launch. Completing onboarding does not move the funds, so the
    // way back into the migration has to survive it.
    const { queryByTestId } = renderHistory({
      totalBalance: withOrchard(0.3),
    });

    expect(queryByTestId('ironwoodbanner.start')).not.toBeNull();
  });

  test('hides once no spendable orchard funds are left', () => {
    // zingolib excludes dust from confirmed_orchard_balance, so a wallet left
    // holding only dust lands here too.
    const { queryByTestId } = renderHistory({
      totalBalance: withOrchard(0),
    });

    expect(queryByTestId('ironwoodbanner.start')).toBeNull();
  });

  test('hides before NU6.3 activates, funds or not', () => {
    const { queryByTestId } = renderHistory({
      info: {
        ...activeInfo,
        latestBlock: (mockInfo.ironwoodActivationHeight as number) - 1,
      },
      totalBalance: withOrchard(0.3),
    });

    expect(queryByTestId('ironwoodbanner.start')).toBeNull();
  });

  test('hides for watch-only wallets, which cannot spend', () => {
    const { queryByTestId } = renderHistory({
      totalBalance: withOrchard(0.3),
      readOnly: true,
    });

    expect(queryByTestId('ironwoodbanner.start')).toBeNull();
  });
});
