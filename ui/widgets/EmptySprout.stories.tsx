import type { Meta, StoryObj } from '@storybook/react-native';
import EmptySprout from './EmptySprout';

const meta: Meta<typeof EmptySprout> = {
  title: 'Components/EmptySprout',
  component: EmptySprout,
  /** Its loops settle on their end frame in the visual capture. */
  tags: ['loop'],
};

export default meta;
type Story = StoryObj<typeof EmptySprout>;

/** The empty history: the sprout tries to stand up and settles back down. */
export const Default: Story = {};
