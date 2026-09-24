import type { Meta, StoryObj } from '@storybook/react-native';
import { SelectServerEnum } from '@app/AppState';
import PriceRow from './PriceRow';
import { mockInfo, mockZecPrice } from '../../../../.storybook/storyMocks';
import { mockTranslate } from '../../../../.storybook/storyDecorators';

const meta: Meta<typeof PriceRow> = {
  title: 'Header/PriceRow',
  component: PriceRow,
  args: {
    translate: mockTranslate,
    zecPrice: mockZecPrice,
    info: mockInfo,
    selectServer: SelectServerEnum.auto,
  },
};

export default meta;
type Story = StoryObj<typeof PriceRow>;

export const Default: Story = {};
export const NoPrice: Story = {
  args: { zecPrice: { zecPrice: 0, date: 0 } },
};
