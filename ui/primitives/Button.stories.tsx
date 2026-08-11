import type { Meta, StoryObj } from '@storybook/react-native';
import { ButtonTypeEnum } from '../../app/AppState';
import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  args: {
    title: 'Send',
    type: ButtonTypeEnum.Primary,
    disabled: false,
    onPress: () => {},
  },
  argTypes: {
    type: {
      control: 'select',
      options: Object.values(ButtonTypeEnum),
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Secondary: Story = { args: { type: ButtonTypeEnum.Secondary } };
export const Ghost: Story = { args: { type: ButtonTypeEnum.Ghost, title: 'Cancel' } };
export const Nym: Story = { args: { type: ButtonTypeEnum.Nym, title: 'Send via Nym' } };
export const Disabled: Story = { args: { disabled: true } };
