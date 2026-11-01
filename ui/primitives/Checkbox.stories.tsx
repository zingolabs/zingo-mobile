/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Checkbox from './Checkbox';

type Args = { disabled: boolean };

/** Both states, each one live. */
const Pair = ({ disabled }: Args) => {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <View style={{ padding: 16 }}>
      <Checkbox
        checked={a}
        onChange={setA}
        disabled={disabled}
        label="I wrote the words down on paper"
      />
      <Checkbox
        checked={b}
        onChange={setB}
        disabled={disabled}
        label="I wrote the words down on paper"
      />
    </View>
  );
};

const meta: Meta<Args> = {
  title: 'Components/Checkbox',
  render: Pair,
  args: { disabled: false },
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
