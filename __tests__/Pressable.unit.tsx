import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Text from '@ui/primitives/Text';
import Pressable from '@ui/primitives/Pressable';
import type { PressKind } from '@ui/primitives/Pressable';

const kinds: PressKind[] = ['button', 'row', 'icon', 'link'];

describe('Pressable', () => {
  test.each(kinds)(
    'Tests that a %s calls onPress and its own press handlers when pressed',
    kind => {
      const onPress = jest.fn();
      const onPressIn = jest.fn();
      const onPressOut = jest.fn();
      render(
        <Pressable
          kind={kind}
          testID="control"
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <Text>Label</Text>
        </Pressable>,
      );
      fireEvent(screen.getByTestId('control'), 'pressIn');
      fireEvent(screen.getByTestId('control'), 'pressOut');
      fireEvent.press(screen.getByTestId('control'));
      expect(onPressIn).toHaveBeenCalledTimes(1);
      expect(onPressOut).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Label')).toBeTruthy();
    },
  );

  test('Tests that nothing fires when the control is disabled', () => {
    const onPress = jest.fn();
    render(
      <Pressable kind="button" testID="control" disabled onPress={onPress}>
        <Text>Label</Text>
      </Pressable>,
    );
    fireEvent.press(screen.getByTestId('control'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
