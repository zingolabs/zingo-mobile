import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WelcomeBranches from '@ui/widgets/WelcomeBranches';

test('both branches render every leaf and stem layer once the area has a size, and nothing before', () => {
  render(<WelcomeBranches width={0} height={0} />);
  expect(screen.queryAllByTestId(/^welcome\./)).toHaveLength(0);

  screen.rerender(<WelcomeBranches width={390} height={330} />);
  expect(screen.getAllByTestId(/^welcome\.left\.leaf\./)).toHaveLength(6);
  expect(screen.getAllByTestId(/^welcome\.right\.leaf\./)).toHaveLength(7);
  expect(screen.getByTestId('welcome.left.stem')).toBeOnTheScreen();
  expect(screen.getByTestId('welcome.right.stem')).toBeOnTheScreen();
});
