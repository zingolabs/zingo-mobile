/**
 * @format
 *
 * The countdown measures from the server tip, but the backend only reports a
 * window as due once the wallet's own sync reaches it. In that gap the banner
 * used to read "Batch N in ~0 blocks" until the next block (~75 s) or a
 * re-focus. It now reads "syncing" and re-reads as the sync advances, and
 * only while the gap lasts.
 */

import 'react-native';
import React from 'react';

import { render, waitFor } from '@testing-library/react-native';
import IronwoodMigrationBanner from '@screens/History/components/IronwoodMigrationBanner';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { InfoType } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { migrationStatus, reconcileMigration } from '@app/walletBackend';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';

jest.mock('@app/walletBackend', () => ({
  migrationStatus: jest.fn(),
  reconcileMigration: jest.fn(),
}));

// The global mock stubs useFocusEffect to a no-op; run it as a plain effect
// that re-runs when the callback identity changes.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('../__mocks__/@react-navigation/native.js'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    require('react').useEffect(cb, [cb]);
  },
}));

const migrationStatusMock = migrationStatus as jest.Mock;
const reconcileMock = reconcileMigration as jest.Mock;

// Keys as text, so the assertions can tell the countdown strings apart.
const translate = (key: string) => key;

const BOUNDARY = 3428640;

const waitingStatus: RPCMigrationStatusType = {
  orchard_confirmed_spendable: 40000000,
  phase: { kind: 'parts_scheduled' },
  parts_total: 12,
  parts_confirmed: 4,
  parts_broadcast: 0,
  value_total: 120000000,
  value_migrated: 40000000,
  per_bucket: 4,
  bucket_modulus: 144,
  upcoming_windows: [
    {
      bucket_index: 23810,
      boundary: BOUNDARY,
      part_ids: [5, 6, 7, 8],
      denominations: [10000000, 10000000, 10000000, 10000000],
      window_opens_unix_time: 0,
      latest_target_unix_time: 0,
    },
  ],
  due_now: null,
};

const dueStatus: RPCMigrationStatusType = {
  ...waitingStatus,
  upcoming_windows: [],
  due_now: {
    boundary: BOUNDARY,
    part_ids: [5, 6, 7, 8],
    denominations: [10000000, 10000000, 10000000, 10000000],
  },
};

const banner = (latestBlock: number, totalBlocksScanned: number) => (
  <ContextAppLoadedProvider
    value={{
      ...defaultAppContextLoaded,
      translate,
      info: { ...mockInfo, latestBlock } as InfoType,
      syncingStatus: {
        total_blocks_scanned: totalBlocksScanned,
      } as RPCSyncStatusType,
    }}
  >
    <IronwoodMigrationBanner
      amount={0.4}
      currencyName="ZEC"
      onStart={jest.fn()}
      onResume={jest.fn()}
    />
  </ContextAppLoadedProvider>
);

describe('Ironwood banner while the wallet syncs to an open window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reconcileMock.mockResolvedValue({ ok: true, value: '{}' });
  });

  test('server tip at the boundary with nothing due reads syncing, not 0 blocks', async () => {
    migrationStatusMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify(waitingStatus),
    });
    const { getByText, queryByText } = render(banner(BOUNDARY, 100));
    await waitFor(() => {
      expect(getByText('ironwoodbanner.next-syncing')).toBeTruthy();
    });
    expect(queryByText('ironwoodbanner.next-in-blocks')).toBeNull();
  });

  test('sync progress re-reads the status and surfaces the due batch', async () => {
    migrationStatusMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify(waitingStatus),
    });
    const { getByText, rerender } = render(banner(BOUNDARY, 100));
    await waitFor(() => {
      expect(getByText('ironwoodbanner.next-syncing')).toBeTruthy();
    });

    // Same server tip, no new block: only the wallet's sync moved.
    migrationStatusMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify(dueStatus),
    });
    rerender(banner(BOUNDARY, 101));
    await waitFor(() => {
      expect(getByText('ironwoodbanner.next-send-now')).toBeTruthy();
    });
  });

  test('before the boundary the countdown stands and sync progress does not re-read', async () => {
    migrationStatusMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify(waitingStatus),
    });
    const { getByText, rerender } = render(banner(BOUNDARY - 10, 100));
    await waitFor(() => {
      expect(getByText('ironwoodbanner.next-in-blocks')).toBeTruthy();
    });
    const calls = migrationStatusMock.mock.calls.length;

    rerender(banner(BOUNDARY - 10, 101));
    rerender(banner(BOUNDARY - 10, 102));
    await waitFor(() => {
      expect(getByText('ironwoodbanner.next-in-blocks')).toBeTruthy();
    });
    expect(migrationStatusMock.mock.calls.length).toBe(calls);
  });
});
