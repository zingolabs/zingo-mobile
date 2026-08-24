/* eslint-disable react-native/no-inline-styles */
import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { Animated, View } from 'react-native';
import ProgressBar from './ProgressBar';

// Hold the Animated.Value at a fixed fraction so the frame is stable.
const meta: Meta<typeof ProgressBar> = {
  title: 'Migration/ProgressBar',
  component: ProgressBar,
  render: ({ progress: _progress, ...args }) => {
    const value = React.useRef(new Animated.Value(0.6)).current;
    return (
      <View style={{ width: 260 }}>
        <ProgressBar {...args} progress={value} />
      </View>
    );
  },
  args: { height: 6 },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {};
export const Thick: Story = { args: { height: 12 } };
