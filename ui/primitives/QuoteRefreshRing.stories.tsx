import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { useTheme } from '@app/theme';
import QuoteRefreshRing from './QuoteRefreshRing';

// Storybook calls `render` as a component. The hooks rule reads it as a plain
// lowercase function, so the theme lookup lives in a named one instead.
const ThemedQuoteRefreshRing = (
  args: React.ComponentProps<typeof QuoteRefreshRing>,
) => {
  const { colors } = useTheme();
  return (
    <QuoteRefreshRing
      {...args}
      color={colors.fgDefault}
      ringColor={colors.bgAccent}
      trackColor={colors.bottomSheetBorder}
    />
  );
};

const meta: Meta<typeof QuoteRefreshRing> = {
  title: 'Components/QuoteRefreshRing',
  component: QuoteRefreshRing,
  render: args => <ThemedQuoteRefreshRing {...args} />,
  args: {
    size: 48,
    color: '#ffffff',
    trackColor: '#333333',
    durationMs: 8000,
    resetKey: 'story',
  },
};

export default meta;
type Story = StoryObj<typeof QuoteRefreshRing>;

export const Default: Story = {};
export const MidCycle: Story = { args: { startProgress: 0.5 } };
