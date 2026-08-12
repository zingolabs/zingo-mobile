import type { Meta, StoryObj } from '@storybook/react-native';
import { ScreenEnum } from '@app/AppState';
import AddressItem from './AddressItem';
import { withAppContext, withNavigation } from '../../.storybook/storyDecorators';
import { uAddress } from '../../.storybook/storyMocks';

const meta: Meta<typeof AddressItem> = {
  title: 'Components/AddressItem',
  component: AddressItem,
  decorators: [withAppContext(), withNavigation],
  args: {
    address: uAddress,
    screenName: ScreenEnum.History,
    oneLine: false,
    withIcon: true,
  },
};

export default meta;
type Story = StoryObj<typeof AddressItem>;

export const Default: Story = {};
export const OneLine: Story = { args: { oneLine: true } };
export const WithSendIcon: Story = { args: { withSendIcon: true } };
