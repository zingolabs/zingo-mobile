import type { Meta, StoryObj } from '@storybook/react-native';
import ChainSelect from './ChainSelect';
import {
  mockTranslate,
  withBottomSheet,
} from '../../.storybook/storyDecorators';

// Mounts a BottomSheetModal for the picker. It needs the sheet provider.
const meta: Meta<typeof ChainSelect> = {
  title: 'Components/ChainSelect',
  component: ChainSelect,
  decorators: [withBottomSheet],
  args: {
    label: 'Pay with',
    value: 'ZEC',
    options: ['ZEC', 'BTC', 'ETH'],
    onChange: () => {},
    translate: mockTranslate,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof ChainSelect>;

export const Multi: Story = {};
export const Single: Story = { args: { options: ['ZEC'] } };
export const Disabled: Story = { args: { disabled: true } };
