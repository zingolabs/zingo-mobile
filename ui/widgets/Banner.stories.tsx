/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Button from '@ui/primitives/Button';
import Banner from './Banner';
import Tag from './Tag';

const Banners = () => (
  <View style={{ gap: 12 }}>
    <Banner
      tone="seed"
      title="Back up your seed phrase"
      tag={<Tag tone="warning">Not backed up</Tag>}
      action={
        <Button
          variant="primary"
          size="small"
          title="Back up"
          onPress={() => {}}
        />
      }
      onDismiss={() => {}}
      dismissLabel="Dismiss"
    >
      If you lose your phone, this is the only way to recover your funds.
    </Banner>
    <Banner tone="warning" title="Transparent address">
      Funds sent here are public on the chain.
    </Banner>
    <Banner tone="viewOnly" title="View-only wallet">
      This wallet can see funds but cannot spend them.
    </Banner>
    <Banner tone="info" title="Syncing">
      Balances update as blocks arrive.
    </Banner>
  </View>
);

const meta: Meta = { title: 'Components/Banner', render: Banners };
export default meta;
type Story = StoryObj;

export const Tones: Story = {};
export const Large200: Story = { parameters: { textScale: 2 } };
