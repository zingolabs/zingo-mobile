import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';

describe('ButtonStack', () => {
  test('Tests that the primary sits on top when the secondary is written first', () => {
    render(
      <ButtonStack>
        <Button variant="text" title="Back" onPress={() => {}} />
        <Button variant="primary" title="Try again" onPress={() => {}} />
      </ButtonStack>,
    );
    const root = screen.toJSON() as ReactTestRendererJSON;
    expect(root.props.style.flexDirection).toBe('column-reverse');
  });
});
