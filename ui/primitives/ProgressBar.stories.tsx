/* eslint-disable react-native/no-inline-styles */
import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import { Animated, View } from 'react-native';
import ProgressBar from './ProgressBar';

// Hold the Animated.Value at a fixed fraction so the frame is stable.
// Storybook calls `render` as a component. The hooks rule reads it as a plain
// lowercase function, so the ref lives in a named one instead.
const HeldProgressBar = (
  args: Omit<React.ComponentProps<typeof ProgressBar>, 'progress'>,
) => {
  const value = React.useRef(new Animated.Value(0.6)).current;
  return (
    <View style={{ width: 260 }}>
      <ProgressBar {...args} progress={value} />
    </View>
  );
};

const meta: Meta<typeof ProgressBar> = {
  title: 'Migration/ProgressBar',
  component: ProgressBar,
  render: ({ progress: _progress, ...args }) => <HeldProgressBar {...args} />,
  args: { height: 6 },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {};
export const Thick: Story = { args: { height: 12 } };
