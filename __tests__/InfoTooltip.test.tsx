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

describe('placeBubble', () => {
  test('Tests that the bubble shifts left to stay on screen when the icon is at the right edge', () => {
    const p = placeBubble({ iconX: 360, iconW: 16, screenW: 390 });
    const onScreenLeft = 360 + p.left;
    expect(onScreenLeft + p.width).toBeLessThanOrEqual(390 - 16);
    expect(onScreenLeft).toBeGreaterThanOrEqual(16);
    expect(p.arrowLeft + 10).toBeLessThanOrEqual(p.width);
  });

  test('Tests that the bubble shifts right to stay on screen when the icon is at the left edge', () => {
    const p = placeBubble({ iconX: 4, iconW: 16, screenW: 390 });
    expect(4 + p.left).toBe(16);
  });

  test('Tests that the bubble is centred on the icon when there is room on both sides', () => {
    const p = placeBubble({ iconX: 187, iconW: 16, screenW: 390 });
    expect(187 + p.left + p.width / 2).toBe(195);
  });

  test('Tests that a narrow screen narrows the bubble to fit inside both edges', () => {
    const p = placeBubble({ iconX: 100, iconW: 16, screenW: 240 });
    expect(p.width).toBe(208);
  });
});
