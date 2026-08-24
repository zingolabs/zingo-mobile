import type { Meta, StoryObj } from '@storybook/react-native';
import TransparentWarning from './TransparentWarning';
import { withAppContext } from '../../storyDecorators';

const meta: Meta<typeof TransparentWarning> = {
  title: 'Receive/TransparentWarning',
  component: TransparentWarning,
  decorators: [withAppContext()],
  args: {
    onSuccess: () => {},
    closeSheet: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof TransparentWarning>;

export const Default: Story = {};
