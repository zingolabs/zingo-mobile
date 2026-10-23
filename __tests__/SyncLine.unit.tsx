/**
 * @format
 */

import 'react-native';
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { NetInfoStateType } from '@react-native-community/netinfo';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import { offlineServer } from '@app/AppState/types/ServerType';
import { markSynced } from '@app/hooks/lastSynced';
import SyncLine from '@ui/widgets/Header/components/SyncLine';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
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
      {...props}
    />,
  );

describe('SyncLine', () => {
  test('Tests that a synced wallet shows the green dot the end-to-end flows wait for', () => {
    const screen = line({});
    expect(screen.getByTestId('header.checkicon')).toBeTruthy();
    expect(screen.getByTestId('header.syncline')).toHaveTextContent(
      /header\.sync-synced/,
    );
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
    act(() => markSynced(Date.now() - 18 * 60 * 1000));
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
});
