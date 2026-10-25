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
import {
  migrationStatus,
  planIronwoodMigration,
  reconcileMigration,
} from '@app/walletBackend';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';
import { RPCMigrationPlanType } from '@app/walletBackend/types/RPCMigrationPlanType';

jest.mock('@app/walletBackend', () => ({
  migrationStatus: jest.fn(),
  planIronwoodMigration: jest.fn(),
  reconcileMigration: jest.fn(),
}));

// The global mock stubs useFocusEffect to a no-op; the reads live there.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('../__mocks__/@react-navigation/native.js'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    require('react').useEffect(cb, [cb]);
  },
}));

const ok = (value: object) => ({ ok: true, value: JSON.stringify(value) });

const noMigration: RPCMigrationStatusType = {
  orchard_confirmed_spendable: 40000,
  phase: null,
  parts_total: 0,
  parts_confirmed: 0,
  parts_broadcast: 0,
  value_total: 0,
  value_migrated: 0,
  per_bucket: 0,
  bucket_modulus: 144,
  upcoming_windows: [],
  due_now: null,
};

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
        onResume={jest.fn()}
        onHide={onHide}
      />
    </ContextAppLoadedProvider>,
  );
}

const withStatus = (status: RPCMigrationStatusType) =>
  (migrationStatus as jest.Mock).mockResolvedValue(ok(status));
const withPlan = (plan: RPCMigrationPlanType) =>
  (planIronwoodMigration as jest.Mock).mockResolvedValue(ok(plan));

beforeEach(() => {
  jest.clearAllMocks();
  (reconcileMigration as jest.Mock).mockResolvedValue({ ok: true, value: '' });
});

test('Tests that the notice offers the X when the planner finds only a residual', async () => {
  withStatus(noMigration);
  withPlan({ parts: [], residual: 40000 });
  const onHide = jest.fn();
  const { findByTestId } = renderBanner(onHide);

  fireEvent.press(await findByTestId('ironwoodbanner.hide'));

  expect(onHide).toHaveBeenCalled();
});

test('Tests that the notice offers the X when the migration is complete', async () => {
  withStatus({ ...noMigration, phase: { kind: 'complete', residual: 40000 } });
  const { findByTestId } = renderBanner(jest.fn());

  expect(await findByTestId('ironwoodbanner.hide')).toBeTruthy();
  expect(planIronwoodMigration).not.toHaveBeenCalled();
});

test('Tests that the notice has no X when Orchard holds funds worth migrating', async () => {
  withStatus(noMigration);
  withPlan({ parts: [10000000], residual: 40000 });
  const { queryByTestId } = renderBanner(jest.fn());

  await waitFor(() => expect(planIronwoodMigration).toHaveBeenCalled());
  expect(queryByTestId('ironwoodbanner.start')).not.toBeNull();
  expect(queryByTestId('ironwoodbanner.hide')).toBeNull();
});
