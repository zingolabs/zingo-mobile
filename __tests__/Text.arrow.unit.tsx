import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Text from '@ui/primitives/Text';
import { ArrowRightIcon } from '@ui/primitives/Icons/ArrowRightIcon';

describe('Text arrows', () => {
  test('Tests that an arrow in the text is drawn as an icon when the text has one', () => {
    render(<Text testID="t">Swap GRAM → ZEC</Text>);
    expect(screen.UNSAFE_getAllByType(ArrowRightIcon)).toHaveLength(1);
    expect(screen.getByTestId('t')).not.toHaveTextContent('→');
    expect(screen.getByTestId('t')).toHaveTextContent(/Swap GRAM\s+ZEC/);
  });

  test('Tests that a text without an arrow keeps its children when it has none', () => {
    render(<Text testID="t">Swap GRAM to ZEC</Text>);
    expect(screen.UNSAFE_queryAllByType(ArrowRightIcon)).toHaveLength(0);
    expect(screen.getByTestId('t').props.children).toBe('Swap GRAM to ZEC');
  });
});
