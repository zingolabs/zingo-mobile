import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadingProvider,
  defaultAppContextLoading,
} from '@app/context';
import StartMenu from '@screens/StartMenu';

const tree = (props: {
  busy?: boolean;
  found?: boolean;
  reviewFound?: () => void;
  dismissFound?: () => void;
}) => (
  <ContextAppLoadingProvider
    value={{
      ...defaultAppContextLoading,
      netInfo: { ...defaultAppContextLoading.netInfo, isConnected: true },
      translate: (key: string) => key,
    }}
  >
    <StartMenu
      actionButtonsDisabled={props.busy ?? false}
      found={props.found ?? true}
      reviewFound={props.reviewFound ?? jest.fn()}
      dismissFound={props.dismissFound ?? jest.fn()}
      customServer={jest.fn()}
      walletExists={false}
      openCurrentWallet={jest.fn()}
      createNewWallet={jest.fn()}
      getwalletToRestore={jest.fn()}
    />
  </ContextAppLoadingProvider>
);

test('Tests that the found card opens the review when a previous install left wallets', () => {
  const reviewFound = jest.fn();
  render(tree({ reviewFound }));
  expect(screen.getByText('found.title')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('loadingapp.foundreview'));
  expect(reviewFound).toHaveBeenCalled();
});

test('Tests that Not now dismisses the found card when it is tapped', () => {
  const dismissFound = jest.fn();
  render(tree({ dismissFound }));
  fireEvent.press(screen.getByTestId('loadingapp.foundnotnow'));
  expect(dismissFound).toHaveBeenCalled();
});

test('Tests that the found card is absent when no previous install left wallets', () => {
  render(tree({ found: false }));
  expect(screen.queryByText('found.title')).toBeNull();
});

test('Tests that only the pressed button shows its spinner when the work starts', () => {
  render(tree({}));
  fireEvent.press(screen.getByTestId('loadingapp.createnewwallet'));
  screen.rerender(tree({ busy: true }));
  expect(
    screen.getByTestId('loadingapp.createnewwallet.spinner'),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId('loadingapp.foundreview.spinner')).toBeNull();
});
