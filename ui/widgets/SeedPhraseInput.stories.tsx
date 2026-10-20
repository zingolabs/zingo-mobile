import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { StyleSheet, View } from 'react-native';
import SeedPhraseInput from './SeedPhraseInput';
import { mockTranslate } from '../../.storybook/storyDecorators';

const Host: React.FunctionComponent<{ initial: string }> = ({ initial }) => {
  const [value, setValue] = useState(initial);
  return (
    <View style={styles.host}>
      <SeedPhraseInput
        value={value}
        onChangeValue={setValue}
        translate={mockTranslate}
      />
    </View>
  );
};

const styles = StyleSheet.create({ host: { padding: 16 } });

const meta: Meta<typeof Host> = {
  title: 'Components/SeedPhraseInput',
  component: Host,
  args: { initial: '' },
};

export default meta;
type Story = StoryObj<typeof Host>;

export const Empty: Story = {};
export const SomeWords: Story = {
  args: { initial: 'abandon ability able about above absent' },
};
export const WithInvalidWord: Story = {
  args: { initial: 'abandon ability arte about' },
};
export const ViewingKey: Story = {
  args: {
    initial:
      'uview1q0d2ycstgdqu8gy3w9glgfd8r3mdkr7yp3hmpkjkv6x5gdla8z3q2e0m3qzg5dmyxv9xtuaqlfn6r7yy4djyr9s0q5vxg0y4x0cqt4dtxhy3w2ksvtnuc',
  },
};
