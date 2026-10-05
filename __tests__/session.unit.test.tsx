import 'react-native';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { SessionProvider, useSession } from '@app/navigation/session';
import { ChainNameEnum, LaunchingModeEnum } from '@app/AppState';
import RegText from '@ui/primitives/RegText';

let open: ReturnType<typeof useSession>['setSession'] = () => {};

const Probe: React.FC = () => {
  const { session, setSession } = useSession();
  open = setSession;
  return <RegText>{session.kind}</RegText>;
};

test('Tests that the session starts on the loading section and moves to the wallet when it is opened', () => {
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  expect(screen.getByText('loading')).toBeOnTheScreen();
  act(() =>
    open({
      kind: 'wallet',
      params: {
        readOnly: false,
        orchardPool: true,
        saplingPool: true,
        transparentPool: true,
        newWallet: false,
        firstLaunchingMessage: LaunchingModeEnum.opening,
        walletChainName: ChainNameEnum.mainChainName,
      },
    }),
  );
  expect(screen.getByText('wallet')).toBeOnTheScreen();
  act(() => open({ kind: 'loading', params: { startingApp: false } }));
  expect(screen.getByText('loading')).toBeOnTheScreen();
});
