import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import KeyboardDone from '@ui/widgets/KeyboardDone';

const labels = { confirm: 'confirm', hide: 'hide-keyboard' };

const renderKey = (ready: boolean) =>
  render(<KeyboardDone nativeID="done" labels={labels} ready={ready} />);

describe('KeyboardDone', () => {
  test('Tests that the key offers to hide the keyboard when the field holds no good value.', () => {
    expect(
      renderKey(false).getByTestId('keyboard.done').props.accessibilityLabel,
    ).toBe('hide-keyboard');
  });

  test('Tests that the key confirms when the field holds a good value.', () => {
    expect(
      renderKey(true).getByTestId('keyboard.done').props.accessibilityLabel,
    ).toBe('confirm');
  });
});
