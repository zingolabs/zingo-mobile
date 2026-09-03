import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';

import NymGateSheet from './NymGateSheet';
import {
  SheetHost,
  withAppContext,
  withBottomSheet,
} from '../../../.storybook/storyDecorators';

const noop = () => {};

const meta: Meta<typeof NymGateSheet> = {
  title: 'Migration/Nym gate sheet',
  tags: ['static'],
  component: NymGateSheet,
  decorators: [withAppContext(), withBottomSheet],
  render: args => (
    <SheetHost>{ref => <NymGateSheet ref={ref} {...args} />}</SheetHost>
  ),
  args: {
    gate: { kind: 'idle' },
    onDismiss: noop,
    onContinue: noop,
    onEnable: noop,
  },
  argTypes: {
    gate: {
      control: 'select',
      options: ['idle', 'connecting', 'died', 'unknown'],
      mapping: {
        idle: { kind: 'idle' },
        connecting: { kind: 'connecting' },
        died: { kind: 'failed', failureKey: 'mixnet.status.died' },
        unknown: { kind: 'failed', failureKey: 'mixnet.status.unknown' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof NymGateSheet>;

export const Idle: Story = {};
export const Connecting: Story = { args: { gate: { kind: 'connecting' } } };
export const Lost: Story = {
  args: { gate: { kind: 'failed', failureKey: 'mixnet.status.died' } },
};
