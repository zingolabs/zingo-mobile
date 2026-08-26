/**
 * @format
 */

import 'react-native';
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';
import MigrationStrategy from '../components/MigrationStrategy';
import { deriveNymGateState } from '../components/MigrationStrategy/components/nymGateState';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { RouteEnum } from '../app/AppState';
import { RPCMixnetIndicatorEnum } from '../app/walletBackend/enums/RPCMixnetIndicatorEnum';
import {
  MixnetView,
  deriveMixnetView,
} from '../app/walletBackend/transforms/mixnetPresenter';
import {
  mixnetConnecting,
  mixnetLost,
  mixnetReady,
  mixnetReconnecting,
  mockInfo,
  mockTotalBalance,
} from '../components/storyMocks';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// Rendering the raw key keeps the assertions on which translation the sheet
// picked, not on catalog prose.
const keyTranslate = (key: string) => key;

function renderScreen(mixnetView: MixnetView) {
  const navigate = jest.fn();
  const props: any = {
    navigation: { ...mockNavigation, navigate },
    route: {
      key: 'Key-1',
      name: RouteEnum.MigrationStrategy,
      params: undefined,
    },
  };
  const context = {
    ...defaultAppContextLoaded,
    translate: keyTranslate,
    info: mockInfo,
    totalBalance: mockTotalBalance,
    nym: true,
    mixnetView,
  };
  const utils = render(
    <ContextAppLoadedProvider value={context}>
      <MigrationStrategy {...props} />
    </ContextAppLoadedProvider>,
  );
  const rerenderWith = (view: MixnetView) =>
    utils.rerender(
      <ContextAppLoadedProvider value={{ ...context, mixnetView: view }}>
        <MigrationStrategy {...props} />
      </ContextAppLoadedProvider>,
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
    // Every view the presenter can emit: the four indicators and the failure
    // report, with and without the reconnect flag, with and without a held
    // Enable tap.
    const indicators = [
      RPCMixnetIndicatorEnum.off,
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
        { kind: 'failure', failure: { reason: 'unconsentedOff' } },
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

  test('a reconnecting bootstrap shows the connecting wait, not red failure copy', () => {
    const { queryByText, getByText } = renderScreen(mixnetReconnecting);

    // The old phase-based guard leaked 'mixnet.status.bootstrapping' into the
    // failure slot, painting "Connecting to mixnet…" as danger copy beside a
    // live Enable button.
    expect(queryByText('mixnet.status.bootstrapping')).toBeNull();
    expect(getByText('migrationstrategy.nym-gate-connecting')).toBeTruthy();
  });

  test('a lost transport shows its status key and a live Enable button', () => {
    const { getByText } = renderScreen(mixnetLost);

    expect(getByText('mixnet.status.died')).toBeTruthy();
    expect(getByText('migrationstrategy.nym-gate-enable')).toBeTruthy();
  });

  test('the enable wait holds through a reconnect blip and continues on ready', () => {
    const { getByText, getByTestId, navigate, rerenderWith } =
      renderScreen(mixnetConnecting);

    fireEvent.press(getByText('migrationstrategy.private-label'));
    fireEvent.press(getByTestId('migrationstrategy.start'));
    expect(navigate).not.toHaveBeenCalled();

    rerenderWith(mixnetReconnecting);
    expect(navigate).not.toHaveBeenCalled();

    rerenderWith(mixnetReady);
    expect(navigate).toHaveBeenCalledWith(RouteEnum.MigrationSplitPlan);
  });
});
