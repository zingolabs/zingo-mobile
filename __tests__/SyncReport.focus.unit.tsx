import 'react-native';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SyncReport from '@screens/SyncReport';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { Route } from '@app/AppState';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockSyncingStatus from '../__mocks__/dataMocks/mockSyncingStatus';
import { mockNetInfo } from '../__mocks__/dataMocks/mockNetInfo';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const screen = () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.birthday = mockWallet.birthday || 0;
  state.syncingStatus = mockSyncingStatus;
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
const selected = (view: ReturnType<typeof screen>, id: string) =>
  view.getByTestId(id).props.accessibilityState?.selected;

test('Tests that a stat card picks its bar when pressed, and lets go when pressed again', () => {
  const view = screen();

  fireEvent.press(view.getByTestId('syncreport.server'));
  expect(selected(view, 'syncreport.server')).toBe(true);
  expect(selected(view, 'syncreport.wallet')).toBe(false);

  fireEvent.press(view.getByTestId('syncreport.wallet'));
  expect(selected(view, 'syncreport.server')).toBe(false);
  expect(selected(view, 'syncreport.wallet')).toBe(true);

  fireEvent.press(view.getByTestId('syncreport.wallet'));
  expect(selected(view, 'syncreport.wallet')).toBe(false);
});

test('Tests that a tap on the blue bar before the wallet picks Server, and a tap off the bars lets go', () => {
  const view = screen();
  const hit = view.getByTestId('syncreport.blocks.hit');

  fireEvent.press(hit, { nativeEvent: { locationX: 1, locationY: 29 } });
  expect(selected(view, 'syncreport.server')).toBe(true);

  fireEvent.press(hit, { nativeEvent: { locationX: 1, locationY: 80 } });
  expect(selected(view, 'syncreport.server')).toBe(false);
});
