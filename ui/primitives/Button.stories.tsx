/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Button from './Button';
import ButtonRow from './ButtonRow';

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
      options: ['primary', 'text', 'quiet', 'danger', 'nym'],
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
export const Small: Story = { args: { size: 'small', title: 'Back up' } };
export const Disabled: Story = { args: { disabled: true } };
export const FullWidth: Story = { args: { fullWidth: true } };

const Row = () => (
  <View style={{ width: 328 }}>
    <ButtonRow>
      <Button variant="text" title="Back" onPress={() => {}} />
      <Button variant="primary" title="Try again" onPress={() => {}} />
    </ButtonRow>
  </View>
);
export const TwoInARow: Story = { render: Row };

/** The OS text at 200%: labels cap at 1.5× and the row stacks. */
export const Primary200: Story = { parameters: { textScale: 2 } };
export const TwoInARow200: Story = {
  render: Row,
  parameters: { textScale: 2 },
};
