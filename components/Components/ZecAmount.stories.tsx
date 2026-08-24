import type { Meta, StoryObj } from '@storybook/react-native';
import { CurrencyNameEnum } from '../../app/AppState';
import ZecAmount from './ZecAmount';

const meta: Meta<typeof ZecAmount> = {
  title: 'Components/ZecAmount',
  component: ZecAmount,
  args: {
    amtZec: 12.53456789,
    size: 24,
    currencyName: CurrencyNameEnum.ZEC,
    privacy: false,
  },
  argTypes: {
    currencyName: { control: 'select', options: Object.values(CurrencyNameEnum) },
  },
};

export default meta;
type Story = StoryObj<typeof ZecAmount>;

export const Default: Story = {};
export const Small: Story = { args: { size: 14, smallPrefix: true } };
export const Private: Story = { args: { privacy: true } };
export const Taz: Story = { args: { currencyName: CurrencyNameEnum.TAZ } };
