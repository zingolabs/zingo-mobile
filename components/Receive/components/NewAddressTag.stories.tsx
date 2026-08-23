import type { Meta, StoryObj } from '@storybook/react-native';
import NewAddressTag from './NewAddressTag';
import { withAppContext, withBottomSheet } from '../../storyDecorators';
import { uAddress } from '../../storyMocks';

// Nests ChainSelect, which mounts a BottomSheetModal. It needs the sheet provider
const meta: Meta<typeof NewAddressTag> = {
  title: 'Receive/NewAddressTag',
  component: NewAddressTag,
  decorators: [withBottomSheet, withAppContext()],
  args: {
    address: uAddress,
    own: false,
    closeSheet: () => {},
    setAddressBook: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof NewAddressTag>;

export const Contact: Story = {};
export const OwnAddress: Story = { args: { own: true } };
