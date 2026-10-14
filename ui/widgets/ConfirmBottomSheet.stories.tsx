import type { Meta, StoryObj } from '@storybook/react-native';
import React from 'react';
import ConfirmBottomSheet from './ConfirmBottomSheet';
import { ConfirmOptions, showConfirm } from '@app/services/showConfirm';
import { withBottomSheet } from '../../.storybook/storyDecorators';

const ConfirmDemo: React.FunctionComponent<{ options: ConfirmOptions }> = ({
  options,
}) => {
  React.useEffect(() => {
    showConfirm(options);
  }, [options]);
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

export const Default: Story = {
  args: {
    options: {
      title: 'Delete Alice?',
      message:
        'This removes the contact only. Past payments stay in your history.',
      buttons: [
        { text: 'Delete', style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ],
    },
  },
};

export const Action: Story = {
  args: {
    options: {
      title: 'Rescan wallet',
      message:
        'Zingo fetches every transaction again and rebuilds your shielded wallet.',
      buttons: [{ text: 'Rescan' }, { text: 'Cancel', style: 'cancel' }],
    },
  },
};
