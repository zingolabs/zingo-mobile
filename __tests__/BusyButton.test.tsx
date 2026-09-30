import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import BusyButton from '@ui/widgets/BusyButton';

test('a press reaches onPress only while enabled, and a press while disabled reports what is missing instead', () => {
  const onPress = jest.fn();
  const onDisabledPress = jest.fn();
  render(
    <BusyButton
      title="Import"
      enabled={false}
      busy={false}
      onPress={onPress}
      onDisabledPress={onDisabledPress}
      testID="go"
    />,
  );
  fireEvent.press(screen.getByTestId('go'));
  expect(onPress).not.toHaveBeenCalled();
  expect(onDisabledPress).toHaveBeenCalledTimes(1);

  screen.rerender(
    <BusyButton
      title="Import"
      enabled={true}
      busy={false}
      onPress={onPress}
      onDisabledPress={onDisabledPress}
      testID="go"
    />,
  );
  fireEvent.press(screen.getByTestId('go'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('the busy state shows a spinner and ignores presses', () => {
  const onPress = jest.fn();
  render(
    <BusyButton
      title="Import"
      enabled={true}
      busy={true}
      onPress={onPress}
      onDisabledPress={() => {}}
      testID="go"
    />,
  );
  expect(screen.getByTestId('go.spinner')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('go'));
  expect(onPress).not.toHaveBeenCalled();
});
