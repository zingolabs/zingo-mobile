import type { Meta, StoryObj } from '@storybook/react-native';
import { ScreenEnum } from '@app/AppState';
import TextInputAddress from './TextInputAddress';
import { withAppContext, withNavigation } from '../../.storybook/storyDecorators';

// Keep the address empty so the native on-mount validator never runs under the web harness.
const meta: Meta<typeof TextInputAddress> = {
  title: 'Components/TextInputAddress',
  component: TextInputAddress,
  decorators: [withAppContext(), withNavigation],
  args: {
    address: '',
    setAddress: () => {},
    setError: () => {},
    disabled: false,
    showLabel: true,
    screenName: ScreenEnum.Send,
  },
};

export default meta;
type Story = StoryObj<typeof TextInputAddress>;

export const Empty: Story = {};
export const NoLabel: Story = { args: { showLabel: false } };
export const Disabled: Story = { args: { disabled: true } };
