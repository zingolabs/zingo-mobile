import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ProgressState from '@ui/widgets/ProgressState';

test('the working state shows the dots under the copy and the done state swaps them for the ring', () => {
  render(<ProgressState state="working" title="Importing" body="Preparing" />);
  expect(screen.getByText('Importing')).toBeOnTheScreen();
  expect(screen.getByText('Preparing')).toBeOnTheScreen();
  expect(screen.getByTestId('progress.dots')).toBeOnTheScreen();

  screen.rerender(
    <ProgressState state="done" title="Imported" body="Opening" />,
  );
  expect(screen.getByTestId('progress.done')).toBeOnTheScreen();
  expect(screen.queryByTestId('progress.dots')).toBeNull();
});
