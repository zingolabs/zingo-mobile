import type { Meta, StoryObj } from '@storybook/react-native';
import SelectBottomSheet from './SelectBottomSheet';
import { SheetHost, withBottomSheet } from '../../.storybook/storyDecorators';

const meta: Meta<typeof SelectBottomSheet> = {
  title: 'Components/SelectBottomSheet',
  component: SelectBottomSheet,
  tags: ['static'],
  decorators: [withBottomSheet],
  render: args => (
    <SheetHost>{ref => <SelectBottomSheet ref={ref} {...args} />}</SheetHost>
  ),
  args: {
    title: 'Server',
    value: 'auto',
    items: [
      { label: 'Automatic', value: 'auto' },
      { label: 'lightwalletd.com', value: 'lwd' },
      { label: 'Custom…', value: 'custom' },
    ],
    onChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof SelectBottomSheet>;

export const Default: Story = {};
export const Searchable: Story = {
  args: { searchable: true, searchPlaceholder: 'Search contacts' },
};
