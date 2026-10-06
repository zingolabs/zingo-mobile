/**
 * The sync blast-radius pin: a sync tick (a new scan snapshot) wakes only the
 * sync consumers reading `syncStatusAtom`, not an unrelated slice. Proven at
 * the atom boundary.
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Provider, createStore, useAtomValue } from 'jotai';

import {
  walletViewSourceAtom,
  walletViewAtom,
} from '@app/AppState/walletViewAtoms';
import { syncStatusAtom } from '@app/AppState/syncAtoms';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';

const syncing = (percent: number): RPCSyncStatusType => ({
  scan_ranges: [{} as never],
  percentage_total_outputs_scanned: percent,
});

describe('sync blast-radius — a sync tick wakes only sync consumers', () => {
  let syncRenders = 0;
  let viewRenders = 0;
  const SyncConsumer = (): null => {
    syncRenders += 1;
    useAtomValue(syncStatusAtom);
    return null;
  };
  const ViewConsumer = (): null => {
    viewRenders += 1;
    useAtomValue(walletViewAtom);
    return null;
  };

  it('a scan snapshot wakes the sync consumer and leaves the view consumer asleep', () => {
    const store = createStore();
    store.set(walletViewSourceAtom, prev => ({ ...prev, readOnly: false }));
    syncRenders = 0;
    viewRenders = 0;
    render(
      <Provider store={store}>
        <SyncConsumer />
        <ViewConsumer />
      </Provider>,
    );
    const baseSync = syncRenders;
    const baseView = viewRenders;

    // A sync tick: the scan percent moves.
    act(() => {
      store.set(syncStatusAtom, syncing(40));
    });
    expect(syncRenders).toBeGreaterThan(baseSync); // the sync consumer woke
    expect(viewRenders).toBe(baseView); // the view consumer stayed asleep
  });

  it('a view-field change leaves the sync consumer asleep', () => {
    const store = createStore();
    syncRenders = 0;
    viewRenders = 0;
    render(
      <Provider store={store}>
        <SyncConsumer />
        <ViewConsumer />
      </Provider>,
    );
    const baseSync = syncRenders;

    act(() => {
      store.set(walletViewSourceAtom, prev => ({
        ...prev,
        readOnly: true,
      }));
    });
    expect(syncRenders).toBe(baseSync); // sync untouched by a view change
  });
});
