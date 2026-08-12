/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, waitFor } from '@testing-library/react-native';
import IronwoodMigrationBanner from '../screens/History/components/IronwoodMigrationBanner';
import SegmentedBar from '../ui/primitives/SegmentedBar';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { InfoType } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { migrationStatus, reconcileMigration } from '../app/walletBackend';
import { RPCMigrationStatusType } from '../app/walletBackend/types/RPCMigrationStatusType';

jest.mock('../app/walletBackend', () => ({
  migrationStatus: jest.fn(),
  reconcileMigration: jest.fn(),
}));

// The global mock stubs useFocusEffect to a no-op; the banner's refresh lives
// there, so this suite runs it as a plain effect, re-running when the callback
// identity changes (the banner keys it to the chain tip).
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('../__mocks__/@react-navigation/native.js'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    require('react').useEffect(cb, [cb]);
  },
}));

const migrationStatusMock = migrationStatus as jest.Mock;
const reconcileMock = reconcileMigration as jest.Mock;

const baseStatus: RPCMigrationStatusType = {
  orchard_confirmed_spendable: 40000000,
  phase: { kind: 'parts_scheduled' },
  parts_total: 12,
  parts_confirmed: 4,
  parts_broadcast: 0,
  value_total: 120000000,
  value_migrated: 40000000,
  per_bucket: 4,
  bucket_modulus: 144,
  upcoming_windows: [],
  due_now: null,
};

// Batch of 4 broadcast and mining while the next window is already open: the
// backend reports due_now alongside parts_broadcast > 0.
const overlapStatus: RPCMigrationStatusType = {
  ...baseStatus,
  parts_broadcast: 4,
  due_now: {
    boundary: 3428608,
    part_ids: [9, 10, 11, 12],
    denominations: [10000000, 10000000, 10000000, 10000000],
  },
};

// The batch mined: broadcast run cleared into the confirmed figures.
const confirmedStatus: RPCMigrationStatusType = {
  ...baseStatus,
  parts_confirmed: 8,
  value_migrated: 80000000,
};

function renderBanner(latestBlock: number) {
  const state = {
    ...defaultAppContextLoaded,
    translate: mockTranslate,
    info: { ...mockInfo, latestBlock } as InfoType,
  };
  const banner = (
    <ContextAppLoadedProvider value={state}>
      <IronwoodMigrationBanner
        amount={0.4}
        currencyName="ZEC"
        onStart={jest.fn()}
        onResume={jest.fn()}
      />
    </ContextAppLoadedProvider>
  );
  return { ...render(banner), state };
}

describe('Ironwood banner broadcast run', () => {
  beforeEach(() => {
    reconcileMock.mockResolvedValue({ ok: true, value: '{}' });
  });

  test('run stays lit while a new window opens over a mining batch', async () => {
    migrationStatusMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify(overlapStatus),
    });
    const { UNSAFE_getByType } = renderBanner(3428600);
    await waitFor(() => {
      expect(UNSAFE_getByType(SegmentedBar).props.active).toBe(4);
    });
    expect(UNSAFE_getByType(SegmentedBar).props.activeSpan).toBe(4);
  });

  test('a new block clears the run into confirmed segments in place', async () => {
    migrationStatusMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify(overlapStatus),
    });
    const { UNSAFE_getByType, rerender } = renderBanner(3428600);
    await waitFor(() => {
      expect(UNSAFE_getByType(SegmentedBar).props.active).toBe(4);
    });

    migrationStatusMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify(confirmedStatus),
    });
    rerender(
      <ContextAppLoadedProvider
        value={{
          ...defaultAppContextLoaded,
          translate: mockTranslate,
          info: { ...mockInfo, latestBlock: 3428601 } as InfoType,
        }}
      >
        <IronwoodMigrationBanner
          amount={0.4}
          currencyName="ZEC"
          onStart={jest.fn()}
          onResume={jest.fn()}
        />
      </ContextAppLoadedProvider>,
    );

    // The same mounted bar swaps its run for confirmed fill, which is the
    // rising edge SegmentedBar's confirm flash fires on.
    await waitFor(() => {
      expect(UNSAFE_getByType(SegmentedBar).props.active).toBeUndefined();
    });
    expect(UNSAFE_getByType(SegmentedBar).props.progress).toBeCloseTo(8 / 12);
  });
});
