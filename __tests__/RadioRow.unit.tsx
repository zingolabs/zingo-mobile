import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import RadioRow from '@ui/widgets/RadioRow';
import Text from '@ui/primitives/Text';

test('Tests that a tap on the aside presses the row when the row leads somewhere', () => {
  const onPress = jest.fn();
  render(
    <RadioRow
      title="USDC"
      selected={false}
      onPress={onPress}
      aside={<Text>3 networks</Text>}
    />,
  );
  fireEvent.press(screen.getByText('3 networks'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('Tests that a tap on the trailing buttons leaves the row alone when they sit outside its press', () => {
  const onPress = jest.fn();
  const onEdit = jest.fn();
  render(
    <RadioRow
      title="Server"
      selected={false}
      onPress={onPress}
      trailing={<Text onPress={onEdit}>Edit</Text>}
    />,
  );
  fireEvent.press(screen.getByText('Edit'));
  expect(onEdit).toHaveBeenCalledTimes(1);
  expect(onPress).not.toHaveBeenCalled();
});
