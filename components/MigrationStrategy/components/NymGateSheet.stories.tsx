import React, { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import NymGateSheet from './NymGateSheet';
import { withAppContext, withBottomSheet } from '../../storyDecorators';

const noop = () => {};

const PresentedSheet = (
  props: Omit<React.ComponentProps<typeof NymGateSheet>, 'ref'>,
) => {
  const ref = useRef<BottomSheetModal>(null);
  useEffect(() => {
    ref.current?.present();
  }, []);
  return <NymGateSheet ref={ref} {...props} />;
};

const meta: Meta<typeof PresentedSheet> = {
  title: 'Migration/Nym gate sheet',
  component: PresentedSheet,
  decorators: [withAppContext(), withBottomSheet],
  args: {
    loading: false,
    failureKey: undefined,
    onDismiss: noop,
    onContinue: noop,
    onEnable: noop,
  },
  argTypes: {
    loading: { control: 'boolean' },
    failureKey: {
      control: 'select',
      options: [undefined, 'mixnet.status.died', 'mixnet.status.bootstrapping'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof PresentedSheet>;

export const Idle: Story = {};
export const Connecting: Story = { args: { loading: true } };
export const Lost: Story = { args: { failureKey: 'mixnet.status.died' } };
