import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import ConfirmBottomSheet from './ConfirmBottomSheet';
import { showConfirm } from '../../app/showConfirm';
import { withBottomSheet } from '../../components/storyDecorators';

const ConfirmDemo: React.FunctionComponent = () => {
  React.useEffect(() => {
    showConfirm({
      title: 'Delete contact?',
      message: 'This removes Alice from your address book.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive' },
      ],
    });
  }, []);
  return <ConfirmBottomSheet />;
};

const meta: Meta<typeof ConfirmDemo> = {
  title: 'Components/ConfirmBottomSheet',
  component: ConfirmDemo,
  tags: ['static'],
  decorators: [withBottomSheet],
};

export default meta;
type Story = StoryObj<typeof ConfirmDemo>;

export const Default: Story = {};
