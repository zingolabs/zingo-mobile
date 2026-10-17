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

export const Computing: Story = {};

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
