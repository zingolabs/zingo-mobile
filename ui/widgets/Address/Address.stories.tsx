import type { Meta, StoryObj } from '@storybook/react-native';
import Address from './Address';
import { uAddress } from '../../../components/storyMocks';

const meta: Meta<typeof Address> = {
  title: 'Components/Address',
  component: Address,
  args: {
    address: uAddress,
    startLength: 12,
    endLength: 12,
    onPress: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof Address>;

export const Default: Story = {};
export const ShortEnds: Story = { args: { startLength: 6, endLength: 6 } };
