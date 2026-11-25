import 'react-native';
import React from 'react';
import { act, render } from '@testing-library/react-native';
import SyncReport from '@screens/SyncReport';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { Route } from '@app/AppState';
import {
  noteHeights,
  resetFreshness,
} from '@app/walletBackend/utils/syncFreshness';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockNetInfo } from '../__mocks__/dataMocks/mockNetInfo';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const en = require('../app/translations/en.json');
const translate = (key: string) =>
  key.split('.').reduce((o: any, k) => o?.[k], en) ?? key;

const screen = (latestBlock: number) => {
  const state = { ...defaultAppContextLoaded };
  state.translate = translate;
  state.info = { ...mockInfo, latestBlock };
  state.totalBalance = mockTotalBalance;
  state.birthday = 2_000_000;
  state.syncingStatus = {};
  state.netInfo = mockNetInfo;
  return render(
    <ContextAppLoadedProvider value={state}>
      <SyncReport
        navigation={mockNavigation}
        route={{
          key: 'SyncReport-1',
          name: Route.SyncReport,
          params: undefined,
        }}
      />
    </ContextAppLoadedProvider>,
  );
};

afterEach(() => {
  act(() => resetFreshness());
});

test('Tests that the server bar shows the last known height when the server gave none. The wallet kept it from its last sync.', () => {
  act(() => noteHeights(3_000_000, 0, Date.now()));
  const view = screen(0);

  expect(view.getByText('Server (last known)')).toBeOnTheScreen();
  expect(view.getByTestId('syncreport.server')).toHaveTextContent(/3,000,000/);
});

test('Tests that the server bar shows the server height when the server gave one', () => {
  act(() => noteHeights(3_000_000, 3_000_010, Date.now()));
  const view = screen(3_000_010);

  expect(view.queryByText('Server (last known)')).toBeNull();
  expect(view.getByTestId('syncreport.server')).toHaveTextContent(/3,000,010/);
});
