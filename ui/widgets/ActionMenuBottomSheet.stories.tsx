import type { Meta, StoryObj } from '@storybook/react-native';
import ActionMenuBottomSheet from './ActionMenuBottomSheet';
import { SheetHost, withBottomSheet } from '../../components/storyDecorators';

const meta: Meta<typeof ActionMenuBottomSheet> = {
  title: 'Components/ActionMenuBottomSheet',
  component: ActionMenuBottomSheet,
  tags: ['static'],
  decorators: [withBottomSheet],
  render: args => (
    <SheetHost>{ref => <ActionMenuBottomSheet ref={ref} {...args} />}</SheetHost>
  ),
  args: {
    title: 'Address actions',
    actions: [
      { label: 'Copy address', onPress: () => {} },
      { label: 'Edit contact', onPress: () => {} },
      { label: 'Delete', onPress: () => {}, destructive: true },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof ActionMenuBottomSheet>;

export const Default: Story = {};
export const NoTitle: Story = { args: { title: undefined } };
