import type { Meta, StoryObj } from '@storybook/react-native';
import CurrencyAmount from './CurrencyAmount';

const meta: Meta<typeof CurrencyAmount> = {
  title: 'Components/CurrencyAmount',
  component: CurrencyAmount,
  args: {
    price: 33.75,
    amtZec: 1.2345,
    privacy: false,
  },
  argTypes: {
  },
};

export default meta;
type Story = StoryObj<typeof CurrencyAmount>;

export const Usd: Story = {};
export const Private: Story = { args: { privacy: true } };
export const NoPrice: Story = { args: { price: 0 } };
