/**
 * @format
 *
 * Batch reminders used to be armed once, at schedule confirmation, so a batch
 * that slid or was rebuilt into another window kept its stale reminder. The
 * builder is shared by the confirmation and the re-arm hook; the hook re-arms
 * when the upcoming windows or their numbering change, clears the reminders
 * when none are left, and never prompts for permission. A permission granted
 * later (back from the system settings) arms what a denial could not.
 */

import 'react-native';
import React from 'react';
import type { AppStateStatus } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import {
  batchRemindersSignature,
  buildBatchReminders,
  firstUpcomingBatchNumber,
} from '@app/notifications/batchReminders';
import { useRearmBatchReminders } from '@app/hooks/useRearmBatchReminders';
import {
  armBatchReminders,
  cancelBatchReminders,
  reminderPermissionGranted,
} from '@app/notifications/reminders';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { ChainNameEnum, InfoType } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import {
  RPCBroadcastWindowType,
  RPCMigrationStatusType,
} from '@app/walletBackend/types/RPCMigrationStatusType';

jest.mock('@app/notifications/reminders', () => ({
  armBatchReminders: jest.fn(async () => {}),
  cancelBatchReminders: jest.fn(async () => {}),
  reminderPermissionGranted: jest.fn(async () => true),
}));

const armMock = armBatchReminders as jest.Mock;
const cancelMock = cancelBatchReminders as jest.Mock;
const permissionMock = reminderPermissionGranted as jest.Mock;

const window = (bucket: number): RPCBroadcastWindowType => ({
  bucket_index: bucket,
  boundary: bucket * 144,
  part_ids: [],
  denominations: [],
  window_opens_unix_time: 1_700_000_000,
  latest_target_unix_time: 1_700_000_000 + 30 * 75,
});

const status = (
  overrides: Partial<RPCMigrationStatusType> = {},
): RPCMigrationStatusType => ({
  orchard_confirmed_spendable: 0,
  phase: { kind: 'parts_scheduled' },
  parts_total: 12,
  parts_confirmed: 4,
  parts_broadcast: 0,
  value_total: 0,
  value_migrated: 0,
  per_bucket: 4,
  bucket_modulus: 144,
  upcoming_windows: [window(23810), window(23811)],
  due_now: null,
  ...overrides,
});

const text = { title: (n: number) => `batch ${n}`, body: 'body' };
const chain = { latestBlock: 23810 * 144 - 100, mainnet: true };

describe('buildBatchReminders', () => {
  test('one reminder per upcoming window, keyed by bucket, numbered in order', () => {
    const reminders = buildBatchReminders(status(), chain, text, 0);
    expect(reminders.map(r => [r.id, r.title])).toEqual([
      ['23810', 'batch 2'],
      ['23811', 'batch 3'],
    ]);
  });

  test('a batch due now or sent and confirming shifts the numbering', () => {
    expect(firstUpcomingBatchNumber(status())).toBe(2);
    expect(firstUpcomingBatchNumber(status({ parts_broadcast: 4 }))).toBe(3);
    expect(
      firstUpcomingBatchNumber(
        status({ due_now: { boundary: 0, part_ids: [], denominations: [] } }),
      ),
    ).toBe(3);
  });

  test('the signature changes with the windows and the numbering only', () => {
    const base = batchRemindersSignature(status());
    expect(
      batchRemindersSignature(status({ orchard_confirmed_spendable: 5 })),
    ).toBe(base);
    expect(
      batchRemindersSignature(status({ upcoming_windows: [window(23811)] })),
    ).not.toBe(base);
    expect(batchRemindersSignature(status({ parts_broadcast: 4 }))).not.toBe(
      base,
    );
  });
});

const Probe: React.FunctionComponent<{
  value: RPCMigrationStatusType | null;
}> = ({ value }) => {
  useRearmBatchReminders(value);
  return null;
};

const probe = (value: RPCMigrationStatusType | null) => (
  <ContextAppLoadedProvider
    value={{
      ...defaultAppContextLoaded,
      translate: (key: string) => key,
      info: {
        ...mockInfo,
        latestBlock: chain.latestBlock,
        chainName: ChainNameEnum.mainChainName,
      } as InfoType,
    }}
  >
    <Probe value={value} />
  </ContextAppLoadedProvider>
);

describe('useRearmBatchReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permissionMock.mockResolvedValue(true);
  });

  test('arms from the first status, and not again while nothing moved', async () => {
    const { rerender } = render(probe(status()));
    await waitFor(() => expect(armMock).toHaveBeenCalledTimes(1));
    expect(armMock.mock.calls[0][0].map((r: { id: string }) => r.id)).toEqual([
      '23810',
      '23811',
    ]);

    rerender(probe(status({ orchard_confirmed_spendable: 5 })));
    await waitFor(() => expect(permissionMock).toHaveBeenCalledTimes(1));
    expect(armMock).toHaveBeenCalledTimes(1);
  });

  test('re-arms when a window moves', async () => {
    const { rerender } = render(probe(status()));
    await waitFor(() => expect(armMock).toHaveBeenCalledTimes(1));

    rerender(probe(status({ upcoming_windows: [window(23812)] })));
    await waitFor(() => expect(armMock).toHaveBeenCalledTimes(2));
    expect(armMock.mock.calls[1][0].map((r: { id: string }) => r.id)).toEqual([
      '23812',
    ]);
  });

  test('clears the reminders when no window is left', async () => {
    render(probe(status({ upcoming_windows: [] })));
    await waitFor(() => expect(cancelMock).toHaveBeenCalled());
    expect(armMock).not.toHaveBeenCalled();
  });

  test('without permission nothing is armed', async () => {
    permissionMock.mockResolvedValue(false);
    render(probe(status()));
    await waitFor(() => expect(permissionMock).toHaveBeenCalledTimes(1));
    expect(armMock).not.toHaveBeenCalled();
  });

  test('a permission granted later, back in the app, arms the reminders', async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    // The ES import of AppState is undefined under the preset; the required
    // module is what the hook subscribes through.
    const RN: typeof import('react-native') = require('react-native');
    const spy = jest
      .spyOn(RN.AppState, 'addEventListener')
      .mockImplementation((_type, handler) => {
        onChange = handler as (state: AppStateStatus) => void;
        return { remove: jest.fn() } as ReturnType<
          typeof RN.AppState.addEventListener
        >;
      });
    permissionMock.mockResolvedValue(false);
    render(probe(status()));
    await waitFor(() => expect(permissionMock).toHaveBeenCalledTimes(1));
    expect(armMock).not.toHaveBeenCalled();

    permissionMock.mockResolvedValue(true);
    onChange?.('active');
    await waitFor(() => expect(armMock).toHaveBeenCalledTimes(1));
    spy.mockRestore();
  });

  test('an unread status leaves the reminders alone', async () => {
    render(probe(null));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(armMock).not.toHaveBeenCalled();
    expect(cancelMock).not.toHaveBeenCalled();
  });
});
