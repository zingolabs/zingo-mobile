/* eslint-disable react-native/no-inline-styles */
import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { View } from 'react-native';
import SegmentedBar from './SegmentedBar';

// The frozen clock lands each self-animating story on one deterministic frame.
const meta: Meta<typeof SegmentedBar> = {
  title: 'Migration/SegmentedBar',
  component: SegmentedBar,
  render: args => (
    <View style={{ width: 260 }}>
      <SegmentedBar {...args} />
    </View>
  ),
  args: { segments: 6, progress: 0.5, active: 3, activeSpan: 1, height: 8 },
};

export default meta;
type Story = StoryObj<typeof SegmentedBar>;

export const Default: Story = {};
export const Broadcast: Story = { args: { active: 2, activeSpan: 3 } };
export const Complete: Story = { args: { progress: 1, active: undefined } };
