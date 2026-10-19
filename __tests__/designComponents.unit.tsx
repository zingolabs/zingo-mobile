import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import Chip from '@ui/primitives/Chip';
import TextField from '@ui/primitives/TextField';
import Avatar from '@ui/widgets/Avatar';
import Banner from '@ui/widgets/Banner';

const c = mockTheme.colors;

describe('Chip', () => {
  test('Tests that a chip reports its state and calls back when pressed', () => {
    const onPress = jest.fn();
    render(
      <Chip selected={true} onPress={onPress} testID="chip">
        Sent
      </Chip>,
    );
    const chip = screen.getByTestId('chip');
    expect(chip.props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('TextField', () => {
  test('Tests that an error replaces the helper when both are given', () => {
    render(
      <TextField
        label="Amount"
        value="1.2.3"
        onChangeText={() => {}}
        helper="In ZEC"
        error="Enter a number"
      />,
    );
    expect(screen.getByText('Enter a number')).toBeTruthy();
    expect(screen.queryByText('In ZEC')).toBeNull();
  });

  test('Tests that the field shows the helper when there is no error', () => {
    render(
      <TextField
        label="Amount"
        value=""
        onChangeText={() => {}}
        helper="In ZEC"
      />,
    );
    expect(screen.getByText('In ZEC')).toBeTruthy();
  });
});

describe('Avatar', () => {
  test('Tests that a contact shows its first letter in its category color', () => {
    render(<Avatar kind="contact" name=" bob" category={2} />);
    const letter = screen.getByText('B');
    expect(letter.props.style.color).toBe(c.fgCategory2);
  });
});

describe('Banner', () => {
  test('Tests that the dismiss button calls back when the banner can be closed', () => {
    const onDismiss = jest.fn();
    render(
      <Banner
        tone="info"
        title="Syncing"
        onDismiss={onDismiss}
        dismissLabel="Dismiss"
      />,
    );
    fireEvent.press(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
