/**
 * @format
 *
 * The status screen promised "We'll send you N notifications" even when
 * notification permission was denied and no reminder was armed. It now says
 * reminders are off in that case, and says nothing until the permission is
 * known.
 */

import 'react-native';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import MigrationStatus from '@screens/MigrationStatus';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { InfoType, RouteEnum } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import { migrationStatus, reconcileMigration } from '@app/walletBackend';
import { reminderPermissionGranted } from '@app/notifications/reminders';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';

jest.mock('@app/walletBackend', () => ({
  migrationStatus: jest.fn(),
  reconcileMigration: jest.fn(),
  cancelIronwoodMigration: jest.fn(),
}));

jest.mock('@app/notifications/reminders', () => ({
  armBatchReminders: jest.fn(async () => {}),
  cancelBatchReminders: jest.fn(async () => {}),
  reminderPermissionGranted: jest.fn(),
}));

// The global mock stubs useFocusEffect to a no-op; the screen's read lives
// there, so run it as a plain effect.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('../__mocks__/@react-navigation/native.js'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    require('react').useEffect(cb, [cb]);
  },
}));

const migrationStatusMock = migrationStatus as jest.Mock;
const reconcileMock = reconcileMigration as jest.Mock;
const permissionMock = reminderPermissionGranted as jest.Mock;

const window = (bucket: number) => ({
  bucket_index: bucket,
  boundary: bucket * 144,
  part_ids: [],
  denominations: [10000000],
  window_opens_unix_time: 0,
  latest_target_unix_time: 0,
});

const scheduled: RPCMigrationStatusType = {
  orchard_confirmed_spendable: 40000000,
  phase: { kind: 'parts_scheduled' },
  parts_total: 12,
  parts_confirmed: 4,
  parts_broadcast: 0,
  value_total: 120000000,
  value_migrated: 40000000,
  per_bucket: 4,
  bucket_modulus: 144,
  upcoming_windows: [window(23810), window(23811)],
  due_now: null,
};

const renderScreen = () =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (key: string) => key,
        info: { ...mockInfo, latestBlock: 23810 * 144 - 50 } as InfoType,
      }}
    >
      <MigrationStatus
        navigation={mockNavigation as any}
        route={
          {
            key: 'Key-1',
            name: RouteEnum.MigrationStatus,
            params: undefined,
          } as any
        }
      />
    </ContextAppLoadedProvider>,
  );

describe('MigrationStatus reminders line', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reconcileMock.mockResolvedValue({ ok: true, value: '{}' });
    migrationStatusMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify(scheduled),
    });
  });

  test('with notifications denied it says reminders are off', async () => {
    permissionMock.mockResolvedValue(false);
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('migrationstatus.reminders-off')).toBeTruthy();
    });
    expect(queryByText('migrationstatus.reminders')).toBeNull();
  });

  test('with notifications allowed it promises the reminders', async () => {
    permissionMock.mockResolvedValue(true);
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => {
      expect(getByText('migrationstatus.reminders')).toBeTruthy();
    });
    expect(queryByText('migrationstatus.reminders-off')).toBeNull();
  });
});
