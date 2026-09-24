import type { Meta, StoryObj } from '@storybook/react-native';
import CircularProgress from './CircularProgress';

const meta: Meta<typeof CircularProgress> = {
  title: 'Components/CircularProgress',
  component: CircularProgress,
  args: {
    size: 120,
    strokeWidth: 10,
    text: '67%',
    progressPercent: 67,
  },
  argTypes: {
    progressPercent: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
};

export default meta;
type Story = StoryObj<typeof CircularProgress>;

export const Default: Story = {};
export const Empty: Story = { args: { progressPercent: 0, text: '0%' } };
export const Full: Story = { args: { progressPercent: 100, text: 'Done' } };
