/**
 * @format
 */

import 'react-native';
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';
import { Provider } from 'jotai';
import { balanceAtom } from '@app/AppState/balance';
import MigrationStrategy from '@screens/MigrationStrategy';
import { deriveNymGateState } from '@screens/MigrationStrategy/components/nymGateState';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { RouteEnum } from '@app/AppState';
import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  MixnetView,
  deriveMixnetView,
} from '@app/walletBackend/transforms/mixnetView';
import {
  mixnetConnecting,
  mixnetLost,
  mixnetReady,
  mixnetReconnecting,
  mockInfo,
  polledMockBalance,
} from '../.storybook/storyMocks';
import { seed, storeWith } from '../.storybook/storeWith';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// Rendering the raw key keeps the assertions on which translation the sheet
// picked, not on catalog prose.
const keyTranslate = (key: string) => key;

function renderScreen(mixnetView: MixnetView, nymSheetOpen?: boolean) {
  const navigate = jest.fn();
  const props: any = {
    navigation: { ...mockNavigation, navigate },
    route: {
      key: 'Key-1',
      name: RouteEnum.MigrationStrategy,
      params: undefined,
    },
    nymSheetOpen,
  };
  const context = {
    ...defaultAppContextLoaded,
    translate: keyTranslate,
    info: mockInfo,
    mixnetView,
  };
  const store = storeWith(seed(balanceAtom, polledMockBalance));
  const utils = render(
    <Provider store={store}>
      <ContextAppLoadedProvider value={context}>
        <MigrationStrategy {...props} />
      </ContextAppLoadedProvider>
    </Provider>,
  );
  const rerenderWith = (view: MixnetView) =>
    utils.rerender(
      <Provider store={store}>
        <ContextAppLoadedProvider value={{ ...context, mixnetView: view }}>
          <MigrationStrategy {...props} />
        </ContextAppLoadedProvider>
      </Provider>,
    );
  return { ...utils, navigate, rerenderWith };
}

describe('deriveNymGateState', () => {
  test('reads a reconnecting bootstrap as connecting, never as a failure', () => {
    expect(deriveNymGateState(false, mixnetReconnecting)).toEqual({
      kind: 'connecting',
    });
  });

  test('reads a lost transport as failed even while a reconnect is flagged', () => {
    // mixnetLost carries reconnecting=true: the flag must not soften died.
    expect(deriveNymGateState(false, mixnetLost)).toEqual({
      kind: 'failed',
      failureKey: 'mixnet.status.died',
    });
  });

  test('fails only on the died and unknown keys, across every view', () => {
    // Every view the transform can emit: the three indicators and the failure
    // report, with and without the reconnect flag, with and without a held
    // Enable tap.
    const indicators = [
      RPCMixnetIndicatorEnum.bootstrapping,
      RPCMixnetIndicatorEnum.ready,
      RPCMixnetIndicatorEnum.died,
    ];
    const views = [false, true].flatMap(reconnecting => [
      ...indicators.map(indicator =>
        deriveMixnetView(
          {
            kind: 'status',
            indicator,
            socks5Addr:
              indicator === RPCMixnetIndicatorEnum.ready
                ? '127.0.0.1:1080'
                : null,
          },
          null,
          reconnecting,
        ),
      ),
      deriveMixnetView(
        {
          kind: 'failure',
          failure: { reason: 'unrecognizedIndicator', claimed: 'off' },
        },
        null,
        reconnecting,
      ),
    ]);

    for (const enabling of [false, true]) {
      for (const view of views) {
        const gate = deriveNymGateState(enabling, view);
        expect(gate.kind === 'failed').toBe(
          view.statusKey === 'mixnet.status.died' ||
            view.statusKey === 'mixnet.status.unknown',
        );
      }
    }
  });
});

describe('MigrationStrategy nym gate sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The sheet renders its content a frame after it presents, so the tests
  // open it through the prop and await the copy.
  test('a reconnecting bootstrap shows the connecting wait, not red failure copy', async () => {
    const { queryByText, findByText } = renderScreen(mixnetReconnecting, true);

    expect(
      await findByText('migrationstrategy.nym-gate-connecting'),
    ).toBeTruthy();
    // The old phase-based guard leaked 'mixnet.status.bootstrapping' into the
    // failure slot, painting "Connecting to mixnet…" as danger copy beside a
    // live Enable button.
    expect(queryByText('mixnet.status.bootstrapping')).toBeNull();
  });

  test('a lost transport shows its status key and a live Enable button', async () => {
    const { findByText, getByText } = renderScreen(mixnetLost, true);

    expect(await findByText('mixnet.status.died')).toBeTruthy();
    expect(getByText('migrationstrategy.nym-gate-enable')).toBeTruthy();
  });

  test('the enable wait holds through a reconnect blip and continues on ready', () => {
    const { getByText, getByTestId, navigate, rerenderWith } =
      renderScreen(mixnetConnecting);

    fireEvent.press(getByText('migrationstrategy.now-label'));
    fireEvent.press(getByTestId('migrationstrategy.start'));
    expect(navigate).not.toHaveBeenCalled();

    rerenderWith(mixnetReconnecting);
    expect(navigate).not.toHaveBeenCalled();

    rerenderWith(mixnetReady);
    expect(navigate).toHaveBeenCalledWith(RouteEnum.MigrationTransactions);
  });
});
