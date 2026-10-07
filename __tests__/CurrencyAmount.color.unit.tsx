jest.mock('@ui/widgets/priceFetcherStore', () => ({
  usePriceHealth: jest.fn(() => 'stale'),
}));

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import CurrencyAmount from '@ui/widgets/CurrencyAmount';

const colorOf = (view: ReturnType<typeof render>) =>
  require('react-native').StyleSheet.flatten(view.getByText(/^\$ /).props.style)
    .color;

test('Tests that a stale price dims the amount, and a warning color overrides it', () => {
  const dimmed = render(
    <CurrencyAmount amtZec={0} price={33.33} priceDate={1} />,
  );
  expect(colorOf(dimmed)).toBe('#888888');

  const warned = render(
    <CurrencyAmount amtZec={0} price={33.33} priceDate={1} color="#ff0000" />,
  );
  expect(colorOf(warned)).toBe('#ff0000');
});
