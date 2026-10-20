/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import type { TextVariant } from '@app/theme';
import Text from './Text';
import BoldText from './BoldText';
import RegText from './RegText';
import FadeText from './FadeText';
import ErrorText from './ErrorText';

const meta: Meta<typeof RegText> = {
  title: 'Components/Text',
  component: RegText,
  args: { children: 'The quick brown fox jumps over 12.5 ZEC' },
};

export default meta;
type Story = StoryObj<typeof RegText>;

export const Reg: Story = {};
export const Bold: Story = { render: args => <BoldText {...args} /> };
export const Fade: Story = { render: args => <FadeText {...args} /> };
export const Error: Story = {
  render: () => (
    <ErrorText>Insufficient balance for this transaction</ErrorText>
  ),
};

const variants: TextVariant[] = [
  'balance',
  'screenTitle',
  'subtitle',
  'button',
  'bodyStrong',
  'body',
  'bodySmall',
  'caption',
  'address',
];

const Scale = () => (
  <View style={{ gap: 8 }}>
    {variants.map(v => (
      <Text key={v} variant={v}>
        {v === 'address' ? 'u1qz7r…9k3d' : `${v} 12.3456 ZEC`}
      </Text>
    ))}
  </View>
);
export const Variants: Story = { render: Scale };

/** The OS text at 200%: each style stops at its cap. */
export const Variants200: Story = {
  render: Scale,
  parameters: { textScale: 2 },
};
