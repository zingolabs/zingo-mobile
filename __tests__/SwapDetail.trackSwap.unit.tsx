jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { BlockExplorerEnum, ChainNameEnum } from '@app/AppState';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import TrackSwap from '@screens/SwapDetail/components/TrackSwap';

const HASH = 'ab12'.repeat(16);

const record = (overrides: Partial<SwapRecordType> = {}): SwapRecordType =>
  ({
    recordId: 'rec-1',
    depositAddress: 't1vault',
    provider: SwapKitProviderEnum.MayachainStreaming,
    direction: SwapDirectionEnum.Outbound,
    routeId: 'route-1',
    sellAsset: {
      swapKitId: 'ZEC.ZEC',
      chain: 'ZEC',
      symbol: 'ZEC',
      ticker: 'ZEC',
      chainId: 'zcash',
      decimals: 8,
    },
    receiveAsset: {
      swapKitId: 'BTC.BTC',
      chain: 'BTC',
      symbol: 'BTC',
      ticker: 'BTC',
      chainId: 'bitcoin',
      decimals: 8,
    },
    sellAmountHumanDecimal: '1',
    expectedReceiveAmount: '0.01',
    minReceiveAmount: '0.009',
    destinationAddress: 'bc1qdest',
    status: SwapStatusEnum.Failed,
    broadcast: { txId: HASH },
    createdAtMs: 1_700_000_000_000,
    updatedAtMs: 1_700_000_000_000,
    ...overrides,
  }) as SwapRecordType;

const renderTrack = (r: SwapRecordType) =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
    >
      <TrackSwap
        record={r}
        zecChainName={ChainNameEnum.mainChainName}
        zecBlockExplorer={BlockExplorerEnum.Zcashexplorer}
      />
    </ContextAppLoadedProvider>,
  );

test('Tests that the section opens closed and lists SwapKit, the provider and Zcash last when it is opened', () => {
  renderTrack(record());
  expect(screen.queryByText('SwapKit Explorer')).toBeNull();

  fireEvent.press(screen.getByTestId('swap.detail.track'));

  expect(
    screen
      .getAllByTestId(/^swap\.detail\.track\.(?!copy)/)
      .map(n => n.props.testID),
  ).toEqual([
    'swap.detail.track.swapkit',
    'swap.detail.track.provider',
    'swap.detail.track.source-explorer',
  ]);
  expect(screen.getByText('Maya Explorer')).toBeTruthy();
});

test('Tests that Copy all links copies every link with its name, one per line', () => {
  renderTrack(record());
  fireEvent.press(screen.getByTestId('swap.detail.track'));

  fireEvent.press(screen.getByTestId('swap.detail.track.copy-all'));

  const copied = (Clipboard.setString as jest.Mock).mock.calls.at(-1)?.[0];
  expect(copied.split('\n')).toHaveLength(3);
  expect(copied).toContain(
    `Maya Explorer: https://explorer.mayachain.info/tx/${HASH}`,
  );
  expect(screen.getByText('swap.copied')).toBeTruthy();
});

test('Tests that the section is not drawn when there is no link to give', () => {
  renderTrack(
    record({
      status: SwapStatusEnum.Expired,
      broadcast: undefined,
      depositAddress: '',
    }),
  );

  expect(screen.queryByTestId('swap.detail.track')).toBeNull();
});
