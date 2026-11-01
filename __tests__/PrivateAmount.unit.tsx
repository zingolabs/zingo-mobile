import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import PrivateAmount, { maskAmounts } from '@ui/widgets/PrivateAmount';

const renderAmount = (privacy: boolean) =>
  render(
    <ContextAppLoadedProvider value={{ ...defaultAppContextLoaded, privacy }}>
      <PrivateAmount text="−1,23 ZEC" />
    </ContextAppLoadedProvider>,
  );

test('Tests that a mask keeps the unit and drops the sign and figures', () => {
  expect(maskAmounts('−1,23 ZEC')).toBe('••••• ZEC');
  expect(maskAmounts('$12.30')).toBe('$•••••');
  expect(maskAmounts('0.1 BTC → 2.0 ZEC')).toBe('••••• BTC → ••••• ZEC');
});

test('Tests that an amount shows as it is when privacy is off', () => {
  renderAmount(false);
  expect(screen.getByText('−1,23 ZEC')).toBeTruthy();
});

test('Tests that a tap reveals a masked amount for a few seconds when privacy is on', () => {
  jest.useFakeTimers();
  renderAmount(true);
  fireEvent.press(screen.getByText('••••• ZEC'));
  expect(screen.getByText('−1,23 ZEC')).toBeTruthy();
  React.act(() => {
    jest.advanceTimersByTime(5000);
  });
  expect(screen.getByText('••••• ZEC')).toBeTruthy();
  jest.useRealTimers();
});
