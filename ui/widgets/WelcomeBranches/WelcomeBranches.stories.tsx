import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import WelcomeBranches from './WelcomeBranches';

const Host: React.FunctionComponent<{ parted: boolean }> = ({ parted }) => {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.host}>
      <WelcomeBranches width={width} height={330} parted={parted} />
    </View>
  );
};

const styles = StyleSheet.create({
  host: { flex: 1, backgroundColor: '#060B12' },
});

const meta: Meta<typeof Host> = {
  title: 'Components/WelcomeBranches',
  component: Host,
  args: { parted: false },
};

export default meta;
type Story = StoryObj<typeof Host>;

// The wind never stops, so a pixel diff catches a different frame each run.
export const Idle: Story = { tags: ['animated'] };
export const Parted: Story = { args: { parted: true } };
