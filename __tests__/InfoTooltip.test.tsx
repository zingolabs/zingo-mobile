import 'react-native';
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import InfoTooltip, { opensBelow, placeBubble } from '@ui/widgets/InfoTooltip';
import TooltipHost from '@ui/widgets/TooltipHost';

const TIP = 'Block height of your first transaction.';

const Host: React.FunctionComponent = () => {
  const [open, setOpen] = useState(false);
  return (
    <InfoTooltip
      label="Birthday"
      text={TIP}
      open={open}
      onToggle={setOpen}
      testID="info"
    />
  );
};

test('tapping the icon opens the bubble and a second tap closes it', () => {
  render(<Host />);
  expect(screen.queryByText(TIP)).toBeNull();
  fireEvent.press(screen.getByTestId('info'));
  expect(screen.getByText(TIP)).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('info'));
  expect(screen.queryByText(TIP)).toBeNull();
});

test('Tests that inside a host the bubble opens in its layer and a tap anywhere closes it', () => {
  render(
    <TooltipHost>
      <Host />
    </TooltipHost>,
  );
  fireEvent.press(screen.getByTestId('info'));
  expect(screen.getByText(TIP)).toBeOnTheScreen();
  expect(screen.getByTestId('tooltip.backdrop')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('tooltip.backdrop'));
  expect(screen.queryByText(TIP)).toBeNull();
  expect(screen.getByTestId('info').props.accessibilityState).toEqual({
    expanded: false,
  });
});

describe('placeBubble', () => {
  test('Tests that the bubble shifts left to stay inside when the icon is at the right edge', () => {
    const p = placeBubble({ iconX: 360, iconW: 16, areaW: 390 });
    expect(p.left + p.width).toBeLessThanOrEqual(390 - 16);
    expect(p.left).toBeGreaterThanOrEqual(16);
    expect(p.arrowLeft + 10).toBeLessThanOrEqual(p.width);
  });

  test('Tests that the bubble shifts right to stay inside when the icon is at the left edge', () => {
    const p = placeBubble({ iconX: 4, iconW: 16, areaW: 390 });
    expect(p.left).toBe(16);
  });

  test('Tests that the bubble is centred on the icon when there is room on both sides', () => {
    const p = placeBubble({ iconX: 187, iconW: 16, areaW: 390 });
    expect(p.left + p.width / 2).toBe(195);
  });

  test('Tests that a narrow area narrows the bubble to fit inside both edges', () => {
    const p = placeBubble({ iconX: 100, iconW: 16, areaW: 240 });
    expect(p.width).toBe(208);
  });
});

describe('opensBelow', () => {
  test('Tests that the bubble opens above when there is room above', () => {
    expect(opensBelow({ iconY: 400, iconH: 16, bubbleH: 60, areaH: 800 })).toBe(
      false,
    );
  });

  test('Tests that the bubble opens below when there is no room above', () => {
    expect(opensBelow({ iconY: 30, iconH: 16, bubbleH: 60, areaH: 800 })).toBe(
      true,
    );
  });

  test('Tests that asked for below it still opens above when there is no room below', () => {
    expect(
      opensBelow({
        iconY: 760,
        iconH: 16,
        bubbleH: 60,
        areaH: 800,
        below: true,
      }),
    ).toBe(false);
  });
});
