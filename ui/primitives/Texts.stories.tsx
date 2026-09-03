import type { Meta, StoryObj } from '@storybook/react-native';
import BoldText from './BoldText';
import RegText from './RegText';
import FadeText from './FadeText';
import ErrorText from './ErrorText';

const meta: Meta<typeof RegText> = {
  title: 'Components/Text',
  component: RegText,
  args: { children: 'The quick brown fox jumps over 12.5 ZEC' },
};

export default meta;
type Story = StoryObj<typeof RegText>;

export const Reg: Story = {};
export const Bold: Story = { render: args => <BoldText {...args} /> };
export const Fade: Story = { render: args => <FadeText {...args} /> };
export const Error: Story = {
  render: () => (
    <ErrorText>Insufficient balance for this transaction</ErrorText>
  ),
};
