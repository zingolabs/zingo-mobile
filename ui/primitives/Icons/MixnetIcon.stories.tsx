import type { Meta, StoryObj } from '@storybook/react-native';
import MixnetIcon from './MixnetIcon';

const meta: Meta<typeof MixnetIcon> = {
  title: 'Header/MixnetIcon',
  component: MixnetIcon,
  args: { phase: 'connecting' },
  argTypes: {
    phase: {
      control: 'select',
      options: ['connecting', 'reconnecting', 'lost', 'ready'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof MixnetIcon>;

export const Connecting: Story = { tags: ['animated'] };
export const Reconnecting: Story = {
  args: { phase: 'reconnecting' },
  tags: ['animated'],
};
export const Lost: Story = { args: { phase: 'lost' } };
export const Ready: Story = { args: { phase: 'ready' } };
