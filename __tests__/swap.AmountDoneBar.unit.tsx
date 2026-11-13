import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import AmountDoneBar from '@screens/Swap/components/AmountDoneBar';

const renderBar = (ready: boolean) =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (key: string) => key }}
    >
      <AmountDoneBar ready={ready} />
    </ContextAppLoadedProvider>,
  );

describe('AmountDoneBar', () => {
  test('Tests that the button offers to hide the keyboard when no amount is typed.', () => {
    const { getByTestId } = renderBar(false);
    const button = getByTestId('swap.amount.done');
    expect(button.props.accessibilityLabel).toBe('swap.hide-keyboard');
  });

  test('Tests that the button confirms the amount when one above zero is typed.', () => {
    const { getByTestId } = renderBar(true);
    expect(getByTestId('swap.amount.done').props.accessibilityLabel).toBe(
      'swap.amount-confirm',
    );
  });
});
