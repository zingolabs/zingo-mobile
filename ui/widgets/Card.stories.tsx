/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Text from '@ui/primitives/Text';
import ListRow from '@ui/primitives/ListRow';
import Card from './Card';
import Tag from './Tag';

const Cards = () => (
  <View style={{ gap: 12 }}>
    <Card>
      <Text variant="bodyStrong">Default</Text>
      <Text variant="bodySmall" tone="muted">
        Groups content on the canvas.
      </Text>
    </Card>
    <Card tone="selected" onPress={() => {}}>
      <Text variant="bodyStrong">Selected option</Text>
    </Card>
    <Card tone="orchard">
      <Tag tone="orchard">Orchard</Tag>
      <Text variant="bodyStrong">1.2345 ZEC</Text>
    </Card>
    <Card tone="ironwood">
      <Tag tone="ironwood">Ironwood</Tag>
      <Text variant="bodyStrong">0.5 ZEC</Text>
    </Card>
    <Card flush>
      <ListRow title="Server" subtitle="zec.rocks" chevron onPress={() => {}} />
      <ListRow
        title="Currency"
        subtitle="USD"
        chevron
        divider
        onPress={() => {}}
      />
    </Card>
  </View>
);

const meta: Meta = { title: 'Components/Card', render: Cards };
export default meta;
type Story = StoryObj;

export const Tones: Story = {};
export const Large200: Story = { parameters: { textScale: 2 } };
