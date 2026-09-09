import type { Meta, StoryObj } from '@storybook/react-native';
import Memo from './Memo';
import { uAddress } from '../../../.storybook/storyMocks';
import { mockTranslate } from '../../../.storybook/storyDecorators';

const meta: Meta<typeof Memo> = {
  title: 'Send/Memo',
  component: Memo,
  args: {
    closeSheet: () => {},
    initialMemo: '',
    includeUAMemoBoolean: false,
    defaultUnifiedAddress: uAddress,
    setMemoText: () => {},
    translate: mockTranslate,
  },
};

export default meta;
type Story = StoryObj<typeof Memo>;

export const Empty: Story = {};
export const WithText: Story = {
  args: { initialMemo: 'Thanks for lunch' },
};
export const ReplyEnabled: Story = { args: { includeUAMemoBoolean: true } };
