/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import Tag, { TagTone } from './Tag';

const tones: [TagTone, string][] = [
  ['neutral', 'Coming soon'],
  ['accent', 'Current'],
  ['warning', 'Not backed up'],
  ['danger', 'Failed'],
  ['viewOnly', 'View only'],
  ['orchard', 'Orchard'],
  ['sapling', 'Sapling'],
  ['ironwood', 'Ironwood'],
  ['transparent', 'Transparent'],
];

const Tags = () => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {tones.map(([t, w]) => (
      <Tag key={t} tone={t}>
        {w}
      </Tag>
    ))}
  </View>
);

const meta: Meta = { title: 'Components/Tag', render: Tags };
export default meta;
type Story = StoryObj;

export const Tones: Story = {};
export const Large200: Story = { parameters: { textScale: 2 } };
