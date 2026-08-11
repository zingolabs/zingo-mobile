import type { Meta, StoryObj } from '@storybook/react-native';
import SingleAddress from './SingleAddress';
import { withAppContext, withNavigation } from '../../components/storyDecorators';
import { sampleTransparent, sampleUnified } from '../../components/storyMocks';

const meta: Meta<typeof SingleAddress> = {
  title: 'Components/SingleAddress',
  component: SingleAddress,
  decorators: [withAppContext(), withNavigation],
  args: {
    address: sampleUnified,
    index: 0,
    setIndex: () => {},
    total: 3,
    show: () => {},
    hasTransparent: true,
  },
};

export default meta;
type Story = StoryObj<typeof SingleAddress>;

export const Unified: Story = {};
export const Transparent: Story = { args: { address: sampleTransparent } };
