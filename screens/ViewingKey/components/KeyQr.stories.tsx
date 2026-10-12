import type { Meta, StoryObj } from '@storybook/react-native';
import KeyQr from './KeyQr';

const KEY =
  'uview1qg8x2m5k7d9w3e6r4t0yhu2jn8ls5c7v3b6nq9pz4xw2k8e5r7t1ym3gd6hf0jn2ks8al4xq7wv9cz5eb3rt6yu1io0pl8mk2nj4hb7gv5fc3dx9sz6aq';

const meta: Meta<typeof KeyQr> = {
  title: 'ViewingKey/KeyQr',
  component: KeyQr,
  args: { value: KEY, size: 196, hidden: false },
};

export default meta;
type Story = StoryObj<typeof KeyQr>;

export const Shown: Story = {};
export const Hidden: Story = { args: { hidden: true } };
