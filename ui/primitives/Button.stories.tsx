/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Button from './Button';
import ButtonStack from './ButtonStack';
import { CopyIcon } from './Icons/CopyIcon';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  args: {
    title: 'Send',
    variant: 'primary',
    disabled: false,
    onPress: () => {},
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'text', 'quiet', 'danger', 'nym', 'secondary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Text: Story = { args: { variant: 'text', title: 'Back' } };
export const Quiet: Story = { args: { variant: 'quiet', title: 'Cancel' } };
export const Danger: Story = {
  args: { variant: 'danger', title: 'Delete wallet' },
};
export const Nym: Story = { args: { variant: 'nym', title: 'Send via Nym' } };
/** Outlined, on the inset fill of its surface; for actions of equal weight. */
export const Secondary: Story = {
  args: { variant: 'secondary', title: 'Copy', icon: CopyIcon },
};
export const Small: Story = { args: { size: 'small', title: 'Back up' } };
export const Disabled: Story = { args: { disabled: true } };
export const Inline: Story = { args: { inline: true, variant: 'text' } };

const Stack = () => (
  <View style={{ width: 328 }}>
    <ButtonStack>
      <Button variant="text" title="Back" onPress={() => {}} />
      <Button variant="primary" title="Try again" onPress={() => {}} />
    </ButtonStack>
  </View>
);
export const TwoStacked: Story = { render: Stack };

/** The OS text at 200%: labels cap at 1.5× and wrap; the button grows. */
export const Primary200: Story = { parameters: { textScale: 2 } };
export const TwoStacked200: Story = {
  render: Stack,
  parameters: { textScale: 2 },
};
