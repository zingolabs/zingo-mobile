/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Avatar from './Avatar';

const Avatars = () => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
    <Avatar kind="contact" name="Alice" category={1} chain="ZEC" />
    <Avatar kind="contact" name="Bob" category={2} chain="BTC" />
    <Avatar kind="contact" name="Carol" category={3} />
    <Avatar kind="contact" name="Dan" category={4} />
    <Avatar kind="contact" name="Eve" category={5} size="lg" chain="ETH" />
    <Avatar kind="wallet" />
    <Avatar kind="wallet" size="lg" />
  </View>
);

const meta: Meta = { title: 'Components/Avatar', render: Avatars };
export default meta;
type Story = StoryObj;

export const All: Story = {};
