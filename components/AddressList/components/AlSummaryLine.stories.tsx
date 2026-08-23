import type { Meta, StoryObj } from '@storybook/react-native';
import AlSummaryLine from './AlSummaryLine';
import { withAppContext } from '../../storyDecorators';
import { sampleTransparent, sampleUnified } from '../../storyMocks';

const meta: Meta<typeof AlSummaryLine> = {
  title: 'AddressList/AlSummaryLine',
  component: AlSummaryLine,
  decorators: [withAppContext()],
  args: {
    index: 0,
    setIndex: () => {},
    item: sampleUnified,
    closeScreen: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AlSummaryLine>;

export const Unified: Story = {};
export const Transparent: Story = { args: { item: sampleTransparent } };
