import type { Meta, StoryObj } from '@storybook/react-native';
import AbSummaryLine from './AbSummaryLine';
import { withAppContext, withNavigation } from '../../../.storybook/storyDecorators';
import { sampleContact } from '../../../.storybook/storyMocks';

const meta: Meta<typeof AbSummaryLine> = {
  title: 'AddressBook/AbSummaryLine',
  component: AbSummaryLine,
  decorators: [withNavigation, withAppContext()],
  args: {
    index: 0,
    item: sampleContact,
    openAbDetail: () => {},
    handleScrollToTop: () => {},
    doAction: () => {},
    addressProtected: false,
  },
};

export default meta;
type Story = StoryObj<typeof AbSummaryLine>;

export const Default: Story = {};
export const Protected: Story = { args: { addressProtected: true } };
