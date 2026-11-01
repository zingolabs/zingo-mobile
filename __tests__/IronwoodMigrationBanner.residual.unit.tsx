/**
 * @format
 */

import 'react-native';
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import IronwoodMigrationBanner from '@screens/History/components/IronwoodMigrationBanner';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { InfoType } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { planOrchardDrain } from '@app/walletBackend';
import { RPCDrainPlanType } from '@app/walletBackend/types/RPCDrainPlanType';

jest.mock('@app/walletBackend', () => ({
  planOrchardDrain: jest.fn(),
}));

// The global mock stubs useFocusEffect to a no-op; the read lives there.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('../__mocks__/@react-navigation/native.js'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    require('react').useEffect(cb, [cb]);
  },
}));

function renderBanner(onHide: jest.Mock) {
  const state = {
    ...defaultAppContextLoaded,
    translate: mockTranslate,
    info: { ...mockInfo, latestBlock: 100 } as InfoType,
  };
  return render(
    <ContextAppLoadedProvider value={state}>
      <IronwoodMigrationBanner
        amount={0.0004}
        currencyName="ZEC"
        onStart={jest.fn()}
        onHide={onHide}
      />
    </ContextAppLoadedProvider>,
  );
}

const withPlan = (plan: RPCDrainPlanType) =>
  (planOrchardDrain as jest.Mock).mockResolvedValue({
    ok: true,
    value: JSON.stringify(plan),
  });

beforeEach(() => {
  jest.clearAllMocks();
});

test('Tests that the notice offers the X when the drain finds only a residual', async () => {
  withPlan({ transactions: [], residual: 40000 });
  const onHide = jest.fn();
  const { findByTestId } = renderBanner(onHide);

  fireEvent.press(await findByTestId('ironwoodbanner.hide'));

  expect(onHide).toHaveBeenCalled();
});

test('Tests that the notice has no X when Orchard holds funds worth migrating', async () => {
  withPlan({
    transactions: [{ inputs: [10000000], output: 9990000, fee: 10000 }],
    residual: 40000,
  });
  const { queryByTestId } = renderBanner(jest.fn());

  await waitFor(() => expect(planOrchardDrain).toHaveBeenCalled());
  expect(queryByTestId('ironwoodbanner.start')).not.toBeNull();
  expect(queryByTestId('ironwoodbanner.hide')).toBeNull();
});
