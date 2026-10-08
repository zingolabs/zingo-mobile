import type { Meta, StoryObj } from '@storybook/react-native';
import SeedBackupNotice from './SeedBackupNotice';
import { withAppContext } from '../../../.storybook/storyDecorators';

const meta: Meta<typeof SeedBackupNotice> = {
  title: 'History/SeedBackupNotice',
  component: SeedBackupNotice,
  decorators: [withAppContext()],
  args: { backedUp: false, onBackUp: () => {} },
};

export default meta;
type Story = StoryObj<typeof SeedBackupNotice>;

export const NotBackedUp: Story = {};
export const BackedUp: Story = { args: { backedUp: true } };
