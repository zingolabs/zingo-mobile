import type { Meta, StoryObj } from '@storybook/react-native';
import PrivacyToggle from './PrivacyToggle';
import { mockTranslate } from '../../../../components/storyDecorators';

const meta: Meta<typeof PrivacyToggle> = {
  title: 'Header/PrivacyToggle',
  component: PrivacyToggle,
  args: {
    privacy: false,
    setPrivacyOption: async () => {},
    addLastSnackbar: () => {},
    translate: mockTranslate,
  },
};

export default meta;
type Story = StoryObj<typeof PrivacyToggle>;

export const Off: Story = {};
export const On: Story = { args: { privacy: true } };
