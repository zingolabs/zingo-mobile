import type { Meta, StoryObj } from '@storybook/react-native';
import RingBorder from './RingBorder';

const meta: Meta<typeof RingBorder> = {
  title: 'Components/RingBorder',
  component: RingBorder,
  args: { size: 64 },
};

export default meta;
type Story = StoryObj<typeof RingBorder>;

export const Default: Story = {};
export const Large: Story = { args: { size: 120 } };
