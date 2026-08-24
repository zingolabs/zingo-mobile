import type { Meta, StoryObj } from '@storybook/react-native';
import { CurrencyEnum } from '../../app/AppState';
import CurrencyAmount from './CurrencyAmount';

const meta: Meta<typeof CurrencyAmount> = {
  title: 'Components/CurrencyAmount',
  component: CurrencyAmount,
  args: {
    price: 33.75,
    amtZec: 1.2345,
    currency: CurrencyEnum.USDCurrency,
    privacy: false,
  },
  argTypes: {
    currency: { control: 'select', options: Object.values(CurrencyEnum) },
  },
};

export default meta;
type Story = StoryObj<typeof CurrencyAmount>;

export const Usd: Story = {};
export const Private: Story = { args: { privacy: true } };
export const NoPrice: Story = { args: { price: 0 } };
