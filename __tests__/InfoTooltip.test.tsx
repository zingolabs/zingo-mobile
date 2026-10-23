import 'react-native';
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import InfoTooltip, { placeBubble } from '@ui/widgets/InfoTooltip';

const Host: React.FunctionComponent = () => {
  const [open, setOpen] = useState(false);
  return (
    <InfoTooltip
      label="Birthday"
      text="Block height of your first transaction."
      open={open}
      onToggle={setOpen}
      testID="info"
    />
  );
};

test('tapping the icon opens the bubble and a second tap closes it', () => {
  render(<Host />);
  expect(
    screen.queryByText('Block height of your first transaction.'),
  ).toBeNull();
  fireEvent.press(screen.getByTestId('info'));
  expect(
    screen.getByText('Block height of your first transaction.'),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('info'));
  expect(
    screen.queryByText('Block height of your first transaction.'),
  ).toBeNull();
});

test('tapping anywhere outside closes the bubble', () => {
  render(<Host />);
  fireEvent.press(screen.getByTestId('info'));
  fireEvent.press(screen.getByTestId('info-close'));
  expect(
    screen.queryByText('Block height of your first transaction.'),
  ).toBeNull();
});

describe('placeBubble', () => {
  const screenSize = {
    screenW: 390,
    screenH: 844,
    insetTop: 47,
    insetBottom: 34,
  };

  test('Tests that the bubble shifts left to stay on screen when the icon is at the right edge', () => {
    const p = placeBubble({
      anchor: { x: 360, y: 400, w: 16, h: 16 },
      bubbleH: 60,
      ...screenSize,
    });
    expect(p.left + p.width).toBeLessThanOrEqual(390 - 16);
    expect(p.left).toBeGreaterThanOrEqual(16);
    expect(p.arrowLeft + 10).toBeLessThanOrEqual(p.width);
  });

  test('Tests that the bubble shifts right to stay on screen when the icon is at the left edge', () => {
    const p = placeBubble({
      anchor: { x: 4, y: 400, w: 16, h: 16 },
      bubbleH: 60,
      ...screenSize,
    });
    expect(p.left).toBe(16);
  });

  test('Tests that the bubble opens below when there is no room above', () => {
    const p = placeBubble({
      anchor: { x: 200, y: 70, w: 16, h: 16 },
      bubbleH: 80,
      ...screenSize,
    });
    expect(p.under).toBe(true);
    expect(p.top).toBeGreaterThan(70);
  });

  test('Tests that the bubble opens above when asked for below but there is no room below', () => {
    const p = placeBubble({
      anchor: { x: 200, y: 780, w: 16, h: 16 },
      bubbleH: 80,
      below: true,
      ...screenSize,
    });
    expect(p.under).toBe(false);
    expect(p.top + 80).toBeLessThanOrEqual(780);
  });
});
