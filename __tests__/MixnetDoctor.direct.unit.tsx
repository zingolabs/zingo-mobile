/**
 * The Mixnet Doctor's measuring: the one leg that leaves the device goes from the
 * real IP, so it waits for the button, and what it found speaks only for the
 * transport it was taken against.
 *
 * @format
 */

import 'react-native';
import React from 'react';

import { act, fireEvent, render } from '@testing-library/react-native';
import MixnetDoctor from '@screens/MixnetDoctor';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { ChainNameEnum, Route, remoteServer } from '@app/AppState';
import { MixnetView } from '@app/walletBackend/mixnetView';
import { mixnetLost, mixnetReady, mockInfo } from '../.storybook/storyMocks';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

const props: any = {
  navigation: mockNavigation,
  route: { key: 'Key-1', name: Route.MixnetDoctor, params: undefined },
};

const screen = (mixnetView: MixnetView) => (
  <ContextAppLoadedProvider
    value={{
      ...defaultAppContextLoaded,
      translate: (key: string) => key,
      info: mockInfo,
      mixnetView,
      server: remoteServer(
        'https://zec.rocks:443',
        ChainNameEnum.mainChainName,
      ),
    }}
  >
    <MixnetDoctor {...props} />
  </ContextAppLoadedProvider>
);

const silentServer = JSON.stringify({
  outcome: 'noAnswer',
  host: 'zec.rocks',
  port: 443,
  resolved: [],
  literal: false,
  after_seconds: 20,
});

describe('the Mixnet Doctor direct probe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      JSON.stringify({ mixnet_indicator: 'died' }),
    );
    mockedBridge.mixnetBootstrapDetailInfo.mockResolvedValue(
      JSON.stringify({ detail: '' }),
    );
    mockedBridge.probeServerInfo.mockResolvedValue(silentServer);
  });

  it('Tests that the server is not contacted when the screen is opened', async () => {
    const { findByTestId } = render(screen(mixnetLost));

    await findByTestId('mixnetdoctor.copy');

    expect(mockedBridge.probeServerInfo).not.toHaveBeenCalled();
  });

  it('Tests that a silent server is named when the button is pressed', async () => {
    const { findByTestId, findByText } = render(screen(mixnetLost));

    fireEvent.press(await findByTestId('mixnetdoctor.run'));

    expect(await findByText('mixnetdoctor.server-silent')).not.toBeNull();
    expect(await findByTestId('mixnetdoctor.server')).not.toBeNull();
    expect(mockedBridge.probeServerInfo).toHaveBeenCalledTimes(1);
  });

  it('Tests that the verdict is dropped when the transport moves on', async () => {
    const { findByTestId, findByText, queryByText, rerender } = render(
      screen(mixnetLost),
    );
    fireEvent.press(await findByTestId('mixnetdoctor.run'));
    await findByText('mixnetdoctor.server-silent');

    mockedBridge.mixnetIndicatorInfo.mockResolvedValue(
      JSON.stringify({ mixnet_indicator: 'ready', socks5_addr: '127.0.0.1:1' }),
    );
    rerender(screen(mixnetReady));

    expect(await findByText('mixnetdoctor.connected')).not.toBeNull();
    expect(queryByText('mixnetdoctor.server-silent')).toBeNull();
  });

  it('Tests that the journal stays away until the details are opened', async () => {
    const { findByTestId, queryByTestId } = render(screen(mixnetLost));

    const details = await findByTestId('mixnetdoctor.details');
    expect(queryByTestId('mixnetdoctor.journal')).toBeNull();

    await act(async () => {
      fireEvent.press(details);
    });

    expect(queryByTestId('mixnetdoctor.journal')).not.toBeNull();
  });
});
