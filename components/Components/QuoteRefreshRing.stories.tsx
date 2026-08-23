import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { useTheme } from '../../app/theme';
import QuoteRefreshRing from './QuoteRefreshRing';

const meta: Meta<typeof QuoteRefreshRing> = {
  title: 'Components/QuoteRefreshRing',
  component: QuoteRefreshRing,
  render: args => {
    const { colors } = useTheme();
    return (
      <QuoteRefreshRing
        {...args}
        color={colors.fgDefault}
        ringColor={colors.bgAccent}
        trackColor={colors.bottomSheetBorder}
      />
    );
  },
  args: {
    size: 48,
    color: '#ffffff',
    trackColor: '#333333',
    durationMs: 8000,
    resetKey: 'story',
    onPress: () => {},
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof QuoteRefreshRing>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
