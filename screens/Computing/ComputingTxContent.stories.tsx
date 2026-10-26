import type { Meta, StoryObj } from '@storybook/react-native';
import { Route } from '@app/AppState';
import ComputingTxContent from './ComputingTxContent';
import {
  screenProps,
  withAppContext,
  withBottomSheet,
  withNavigation,
} from '../../.storybook/storyDecorators';

const meta: Meta<typeof ComputingTxContent> = {
  title: 'LoadedApp/ComputingTx',
  component: ComputingTxContent,
  decorators: [withAppContext(), withNavigation, withBottomSheet],
  args: screenProps(Route.Computing),
};

export default meta;
type Story = StoryObj<typeof ComputingTxContent>;

/**
 * Static as the others: the screen is a full panel (a sheet) that measures
 * on a real rendering step, so its capture needs the frame-by-frame play.
 * The capture also reduces motion, so the flight's loop rests on its end
 * frame instead of the frame the mount happened to land on.
 */
export const Computing: Story = { tags: ['static'] };

export const Created: Story = {
  tags: ['static'],
  args: screenProps(Route.Computing, { phase: 'created' }),
};

export const Failed: Story = {
  tags: ['static'],
  args: screenProps(Route.Computing, {
    phase: 'failed',
    failure: {
      kind: 'verbatim',
      text: 'Insufficient balance to cover the fee.',
    },
  }),
};
