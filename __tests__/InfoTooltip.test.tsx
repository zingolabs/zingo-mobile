import 'react-native';
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import InfoTooltip from '@ui/widgets/InfoTooltip';

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
  expect(screen.queryByText('Block height of your first transaction.')).toBeNull();
  fireEvent.press(screen.getByTestId('info'));
  expect(
    screen.getByText('Block height of your first transaction.'),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('info'));
  expect(screen.queryByText('Block height of your first transaction.')).toBeNull();
});
