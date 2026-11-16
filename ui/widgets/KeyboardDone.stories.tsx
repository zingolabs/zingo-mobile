/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { DoneKey } from './KeyboardDone';

const labels = { confirm: 'Confirm', hide: 'Hide keyboard' };

const Keys = () => (
  <View style={{ flexDirection: 'row', gap: 16 }}>
    <DoneKey labels={labels} ready={false} />
    <DoneKey labels={labels} ready />
  </View>
);

const meta: Meta = { title: 'Components/KeyboardDone', render: Keys };
export default meta;
type Story = StoryObj;

export const States: Story = {};
