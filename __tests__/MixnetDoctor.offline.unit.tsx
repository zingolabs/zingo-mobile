/**
 * The Mixnet Doctor while nym rests at `off` (zingo-mobile#1427): an Offline
 * session has no transport to diagnose. The probes would time a local FFI call
 * and report the state the header already shows, so the screen explains itself
 * and offers nothing — no report, no latencies, no run, nothing to copy.
 *
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import MixnetDoctor from '@screens/MixnetDoctor';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { RouteEnum } from '@app/AppState';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import { mixnetOff, mixnetReady, mockInfo } from '../.storybook/storyMocks';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

// Rendering the raw key keeps the assertions on which translation the screen
// picked, not on catalog prose.
const keyTranslate = (key: string) => key;

function renderScreen(mixnetView: MixnetView) {
  const props: any = {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.MixnetDoctor, params: undefined },
  };
  return render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: keyTranslate,
        info: mockInfo,
        mixnetView,
      }}
    >
      <MixnetDoctor {...props} />
    </ContextAppLoadedProvider>,
  );
}

describe('the Mixnet Doctor while nym rests at off', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      JSON.stringify({ mixnet_indicator: 'off' }),
    );
    mockedBridge.mixnetBootstrapDetailInfo.mockResolvedValue(
      JSON.stringify({ detail: '' }),
    );
  });

  it('says why there is nothing to diagnose instead of promising a probe', () => {
    const { queryByText } = renderScreen(mixnetOff);

    expect(queryByText('mixnetdoctor.offline')).not.toBeNull();
    expect(queryByText('mixnetdoctor.intro')).toBeNull();
  });

  it('never probes on entry', () => {
    renderScreen(mixnetOff);

    expect(mockedBridge.mixnetIndicatorInfo).not.toHaveBeenCalled();
    expect(mockedBridge.mixnetBootstrapDetailInfo).not.toHaveBeenCalled();
  });

  it('leaves the run inert and offers nothing to copy', () => {
    const { getByTestId, queryByTestId } = renderScreen(mixnetOff);

    expect(
      getByTestId('mixnetdoctor.run').props.accessibilityState.disabled,
    ).toBe(true);
    expect(queryByTestId('mixnetdoctor.copy')).toBeNull();
    // The remedy belongs to a lost transport, never to the user's own choice.
    expect(queryByTestId('mixnetdoctor.reenable')).toBeNull();
  });

  // The control: a session with a transport still gets the whole screen.
  it('probes and offers the report for a session that has a transport', async () => {
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      JSON.stringify({
        mixnet_indicator: 'ready',
        socks5_addr: '127.0.0.1:1080',
      }),
    );
    const { findByTestId, queryByText } = renderScreen(mixnetReady);

    expect(queryByText('mixnetdoctor.intro')).not.toBeNull();
    expect(await findByTestId('mixnetdoctor.copy')).not.toBeNull();
    expect(mockedBridge.mixnetIndicatorInfo).toHaveBeenCalled();
    // The disabled assertion above is only worth making if the same button
    // reads enabled here.
    expect(
      (await findByTestId('mixnetdoctor.run')).props.accessibilityState
        .disabled,
    ).toBe(false);
  });
});
