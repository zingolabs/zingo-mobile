import type { Meta, StoryObj } from '@storybook/react-native';
import DetailLine from './DetailLine';
import { withAppContext } from '../../components/storyDecorators';

const meta: Meta<typeof DetailLine> = {
  title: 'Components/DetailLine',
  component: DetailLine,
  decorators: [withAppContext()],
  args: {
    label: 'Transaction ID',
    value: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  },
};

export default meta;
type Story = StoryObj<typeof DetailLine>;

export const Default: Story = {};
export const LongValue: Story = {
  args: {
    label: 'Memo',
    value: 'Payment for the October invoice, thanks for the quick turnaround.',
  },
};
