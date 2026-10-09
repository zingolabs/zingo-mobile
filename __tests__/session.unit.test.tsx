import 'react-native';
import React from 'react';
import type { Linking as LinkingType } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { SessionProvider, useSession } from '@app/navigation/session';
import { ChainNameEnum, LaunchingModeEnum } from '@app/AppState';
import RegText from '@ui/primitives/RegText';

// The named import resolves to nothing under jest; the module's own getter
// returns the mocked object the provider subscribes through.
const Linking: typeof LinkingType = jest.requireActual('react-native').Linking;

let open: ReturnType<typeof useSession>['setSession'] = () => {};
let clear: () => void = () => {};

const Probe: React.FC = () => {
  const { session, setSession, pendingLink, clearLink } = useSession();
  open = setSession;
  clear = clearLink;
  return (
    <>
      <RegText>{session.kind}</RegText>
      <RegText>{`link:${pendingLink ?? 'none'}`}</RegText>
    </>
  );
};

const walletParams = {
  readOnly: false,
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  newWallet: false,
  firstLaunchingMessage: LaunchingModeEnum.opening,
  walletChainName: ChainNameEnum.mainChainName,
};

const urlListener = () => {
  const calls = (Linking.addEventListener as jest.Mock).mock.calls;
  return calls[calls.length - 1][1] as (e: { url: string }) => void;
};

beforeEach(() => {
  (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
});

test('Tests that the session starts on boot, moves to the wallet when it opens, and back to boot when the wallet is left', async () => {
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  expect(await screen.findByText('boot')).toBeOnTheScreen();
  act(() => open({ kind: 'wallet', params: walletParams }));
  expect(screen.getByText('wallet')).toBeOnTheScreen();
  act(() => open({ kind: 'boot', startingApp: false, newWallet: false }));
  expect(screen.getByText('boot')).toBeOnTheScreen();
});

test('Tests that a link received during boot waits for the wallet and is cleared once taken', async () => {
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  expect(await screen.findByText('boot')).toBeOnTheScreen();
  act(() => urlListener()({ url: 'zcash:u1test' }));
  expect(screen.getByText('link:zcash:u1test')).toBeOnTheScreen();
  act(() => clear());
  expect(screen.getByText('link:none')).toBeOnTheScreen();
});

test('Tests that a link received during onboarding is dropped. There is no wallet to pay from', async () => {
  render(
    <SessionProvider initial={{ kind: 'onboarding' }}>
      <Probe />
    </SessionProvider>,
  );
  expect(await screen.findByText('onboarding')).toBeOnTheScreen();
  act(() => urlListener()({ url: 'zcash:u1test' }));
  expect(screen.getByText('link:none')).toBeOnTheScreen();
});
