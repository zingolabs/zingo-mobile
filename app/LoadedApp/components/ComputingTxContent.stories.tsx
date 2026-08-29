import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '../../AppState';
import ComputingTxContent from './ComputingTxContent';
import {
  screenProps,
  withAppContext,
  withBottomSheet,
  withNavigation,
} from '../../../components/storyDecorators';

const meta: Meta<typeof ComputingTxContent> = {
  title: 'LoadedApp/ComputingTx',
  component: ComputingTxContent,
  decorators: [withAppContext(), withNavigation, withBottomSheet],
  args: screenProps(RouteEnum.Computing),
};

export default meta;
type Story = StoryObj<typeof ComputingTxContent>;

export const Computing: Story = {};

export const Created: Story = {
  tags: ['static'],
  args: screenProps(RouteEnum.Computing, { phase: 'created' }),
};

export const Failed: Story = {
  tags: ['static'],
  args: screenProps(RouteEnum.Computing, {
    phase: 'failed',
    errorMessage: 'Insufficient balance to cover the fee.',
  }),
};
