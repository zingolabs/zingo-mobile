/**
 * @format
 */

import 'react-native';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { NetInfoStateType } from '@react-native-community/netinfo';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import { offlineServer } from '@app/AppState/types/ServerType';
import {
  noteHeights,
  resetFreshness,
} from '@app/walletBackend/utils/syncFreshness';
import SyncLine from '@ui/widgets/Header/components/SyncLine';
import { INITIAL_SERVER_HEALTH_VIEW } from '@app/services/serverHealthMonitor';
import { showServerHealth } from '@app/services/showServerHealth';

jest.mock('@app/services/showServerHealth', () => ({
  showServerHealth: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

/** The raw key, with its params, so assertions read what was picked. */
const keyTranslate = (key: string) => key;

const zecRocks = remoteServer(
  'https://zec.rocks:443',
  ChainNameEnum.mainChainName,
);
const online = {
  isConnected: true,
  type: NetInfoStateType.wifi,
  isConnectionExpensive: false,
};

const line = (props: Partial<React.ComponentProps<typeof SyncLine>>) =>
  render(
    <SyncLine
      server={zecRocks}
      netInfo={online}
      percentage={100}
      syncInProgress={false}
      translate={keyTranslate}
      opening=""
      health={INITIAL_SERVER_HEALTH_VIEW}
      onDefaultBack={jest.fn()}
      {...props}
    />,
  );

const MIN = 60 * 1000;

beforeEach(() => {
  act(() => resetFreshness());
  jest.clearAllMocks();
});

describe('SyncLine', () => {
  test('Tests that a synced wallet shows the green dot the end-to-end flows wait for', () => {
    const screen = line({});
    expect(screen.getByTestId('header.checkicon')).toBeTruthy();
    expect(screen.getByTestId('header.syncline')).toHaveTextContent(
      /header\.sync-synced/,
    );
  });

  test('Tests that a synced wallet shows no age when it keeps up with the tip', () => {
    act(() => noteHeights(100, 100, Date.now() - 26 * MIN));
    const screen = line({});
    const text = screen.getByTestId('header.syncline');
    expect(text).toHaveTextContent(/header\.sync-synced/);
    expect(text).not.toHaveTextContent(/header\.sync-minutes-ago/);
  });

  test('Tests that a wallet trailing the tip for minutes says it falls behind and how old the balance is', () => {
    act(() => {
      noteHeights(100, 100, Date.now() - 8 * MIN);
      noteHeights(100, 104, Date.now());
    });
    const screen = line({});
    const text = screen.getByTestId('header.syncline');
    expect(screen.getByTestId('header.sync-behind')).toBeTruthy();
    expect(text).toHaveTextContent(/header\.sync-behind/);
    expect(text).toHaveTextContent(/header\.sync-balance-from/);
  });

  test('Tests that a block mid-scan is still synced when the wallet trails the tip by one', () => {
    act(() => {
      noteHeights(100, 100, Date.now() - 8 * MIN);
      noteHeights(100, 101, Date.now());
    });
    const screen = line({});
    expect(screen.queryByTestId('header.sync-behind')).toBeNull();
  });

  test('Tests that the first connection names the server it is reaching', () => {
    const screen = line({ percentage: 0, syncInProgress: true });
    expect(screen.getByTestId('header.syncline')).toHaveTextContent(
      /header\.sync-connecting/,
    );
  });

  test('Tests that a sync in progress reads its percentage', () => {
    const screen = line({ percentage: 42, syncInProgress: true });
    expect(screen.getByTestId('header.syncline')).toHaveTextContent(
      /header\.sync-syncing/,
    );
  });

  test('Tests that offline mode says how old the balance is once a sync was seen', () => {
    act(() => noteHeights(100, 100, Date.now() - 18 * MIN));
    const screen = line({
      server: offlineServer(ChainNameEnum.mainChainName),
    });
    const text = screen.getByTestId('header.syncline');
    expect(text).toHaveTextContent(/header\.sync-offline/);
    expect(text).toHaveTextContent(/header\.sync-balance-from/);
  });

  test('Tests that no internet wins over every other state', () => {
    const screen = line({
      netInfo: { ...online, isConnected: false },
      percentage: 42,
      syncInProgress: true,
    });
    expect(screen.getByTestId('header.syncline')).toHaveTextContent(
      /header\.sync-no-internet/,
    );
  });

  test('Tests that mobile data is added at the end when the connection is metered', () => {
    const screen = line({
      netInfo: { ...online, type: NetInfoStateType.cellular },
    });
    expect(screen.getByTestId('header.syncline')).toHaveTextContent(
      /header\.sync-mobile-data/,
    );
  });

  test('Tests that the line shows only its warning when it falls behind on mobile data', () => {
    act(() => {
      noteHeights(100, 100, Date.now() - 8 * MIN);
      noteHeights(100, 104, Date.now());
    });
    const screen = line({
      netInfo: { ...online, type: NetInfoStateType.cellular },
    });
    const text = screen.getByTestId('header.syncline');
    expect(text).toHaveTextContent(/header.sync-behind/);
    expect(text).not.toHaveTextContent(/header.sync-mobile-data/);
  });

  test('Tests that the line shows mobile data and says it aloud when it is synced on mobile data', () => {
    const screen = line({
      netInfo: { ...online, type: NetInfoStateType.cellular },
    });
    const text = screen.getByTestId('header.syncline');
    expect(text).toHaveTextContent(/header.sync-mobile-data/);
    expect(text.props.accessibilityLabel).toContain('header.sync-mobile-data');
  });

  test('Tests that the line shows only its warning when it is offline on mobile data', () => {
    const screen = line({
      server: offlineServer(ChainNameEnum.mainChainName),
      netInfo: { ...online, type: NetInfoStateType.cellular },
    });
    expect(screen.getByTestId('header.syncline')).not.toHaveTextContent(
      /header.sync-mobile-data/,
    );
  });
});

test('Tests that the line names the wallet being opened when a switch is under way', () => {
  const screen = line({ opening: 'Savings' });

  expect(screen.getByTestId('header.sync-opening')).toBeTruthy();
  expect(screen.getByTestId('header.syncline')).toHaveTextContent(
    /wallets.opening/,
  );
});

test('Tests that a down server shows a red dot with muted words, and a tap opens the server status instead of the report', () => {
  const screen = line({
    health: { ...INITIAL_SERVER_HEALTH_VIEW, level: 'down' },
  });
  expect(screen.getByTestId('header.sync-serverDown')).toBeTruthy();
  expect(screen.getByTestId('header.syncline')).toHaveTextContent(
    /header.sync-server-down/,
  );
  fireEvent.press(screen.getByTestId('header.syncline'));
  expect(showServerHealth).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('Tests that a slow server says so when the wallet is syncing', () => {
  const screen = line({
    syncInProgress: true,
    percentage: 40,
    health: { ...INITIAL_SERVER_HEALTH_VIEW, level: 'slow' },
  });
  expect(screen.getByTestId('header.sync-serverSlow')).toBeTruthy();
});

test('Tests that a tap asks about going back when the default server works again', () => {
  const onDefaultBack = jest.fn();
  const screen = line({
    onDefaultBack,
    health: {
      ...INITIAL_SERVER_HEALTH_VIEW,
      defaultBack: true,
      defaultUri: 'https://zec.global:443',
    },
  });
  fireEvent.press(screen.getByTestId('header.syncline'));
  expect(onDefaultBack).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('Tests that a healthy server keeps the tap on the Sync report', () => {
  const screen = line({});
  fireEvent.press(screen.getByTestId('header.syncline'));
  expect(mockNavigate).toHaveBeenCalledWith('SyncReport');
});
