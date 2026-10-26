/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Switch from './Switch';

type Args = { variant: 'default' | 'nym'; disabled: boolean };

/** Both states side by side, each one live. */
const Pair = ({ variant, disabled }: Args) => {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <View style={{ flexDirection: 'row', gap: 24, padding: 16 }}>
      <Switch
        value={a}
        onValueChange={setA}
        variant={variant}
        disabled={disabled}
        accessibilityLabel="Off"
      />
      <Switch
        value={b}
        onValueChange={setB}
        variant={variant}
        disabled={disabled}
        accessibilityLabel="On"
      />
    </View>
  );
};

const meta: Meta<Args> = {
  title: 'Components/Switch',
  render: Pair,
  args: { variant: 'default', disabled: false },
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const Nym: Story = { args: { variant: 'nym' } };
export const Disabled: Story = { args: { disabled: true } };
