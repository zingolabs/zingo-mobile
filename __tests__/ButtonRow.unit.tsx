import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import Button from '@ui/primitives/Button';
import ButtonRow from '@ui/primitives/ButtonRow';

const row = () =>
  render(
    <ButtonRow>
      <Button variant="text" title="Back" onPress={() => {}} />
      <Button variant="primary" title="Try again" onPress={() => {}} />
    </ButtonRow>,
  );

/** The row is the root of the render: one element, not an array. */
const direction = () =>
  (screen.toJSON() as ReactTestRendererJSON).props.style.flexDirection;

describe('ButtonRow', () => {
  test('Tests that the two buttons sit side by side when both labels fit on one line', () => {
    row();
    fireEvent(screen.getByText('Try again'), 'textLayout', {
      nativeEvent: { lines: [{}] },
    });
    expect(direction()).toBe('row');
  });

  test('Tests that the buttons stack, primary on top, when a label wraps', () => {
    row();
    fireEvent(screen.getByText('Try again'), 'textLayout', {
      nativeEvent: { lines: [{}, {}] },
    });
    expect(direction()).toBe('column-reverse');
  });
});
