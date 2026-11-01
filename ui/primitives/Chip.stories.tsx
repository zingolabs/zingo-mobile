/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Chip from './Chip';

const Filters = () => {
  const [on, setOn] = useState('Received');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {['All', 'Received', 'Sent', 'With memo', 'Failed'].map(f => (
        <Chip key={f} selected={on === f} onPress={() => setOn(f)}>
          {f}
        </Chip>
      ))}
    </View>
  );
};

const meta: Meta = { title: 'Components/Chip', render: Filters };
export default meta;
type Story = StoryObj;

export const Default: Story = {};
export const Large200: Story = { parameters: { textScale: 2 } };
