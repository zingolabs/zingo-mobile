import type { Meta, StoryObj } from '@storybook/react-native';
import ViewOnlyNotice from './ViewOnlyNotice';
import { withAppContext } from '../../../.storybook/storyDecorators';

const meta: Meta<typeof ViewOnlyNotice> = {
  title: 'History/ViewOnlyNotice',
  component: ViewOnlyNotice,
  decorators: [withAppContext()],
  args: { onViewKey: () => {}, onDismiss: () => {} },
};

export default meta;
type Story = StoryObj<typeof ViewOnlyNotice>;

export const Default: Story = {};
