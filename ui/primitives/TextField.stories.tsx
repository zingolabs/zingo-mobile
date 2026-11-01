/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import TextField from './TextField';
import { ScanIcon } from './Icons/ScanIcon';

const Fields = () => {
  const [a, setA] = useState('');
  const [b, setB] = useState('u1qz7rexampleaddress9k3d');
  const [c, setC] = useState('12.5.1');
  return (
    <View style={{ gap: 20 }}>
      <TextField
        label="Address"
        value={a}
        onChangeText={setA}
        placeholder="Zcash address"
        helper="Paste or scan an address"
        trailingIcon={ScanIcon}
        trailingLabel="Scan a QR code"
        onTrailingPress={() => {}}
      />
      <TextField label="Address" value={b} onChangeText={setB} mono valid />
      <TextField
        label="Amount"
        value={c}
        onChangeText={setC}
        error="Enter a number, such as 1.25"
      />
    </View>
  );
};

const meta: Meta = { title: 'Components/TextField', render: Fields };
export default meta;
type Story = StoryObj;

export const States: Story = {};
export const Large200: Story = { parameters: { textScale: 2 } };
