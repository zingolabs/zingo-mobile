import type { Meta, StoryObj } from '@storybook/react-native';
import ExpandedAddress from './ExpandedAddress';
import { uAddress } from '../../.storybook/storyMocks';

const meta: Meta<typeof ExpandedAddress> = {
  title: 'Receive/ExpandedAddress',
  component: ExpandedAddress,
  args: {
    address: uAddress,
    closeSheet: () => {},
    title: 'Unified address',
    button: 'Copy',
  },
};

export default meta;
type Story = StoryObj<typeof ExpandedAddress>;

export const Default: Story = {};
