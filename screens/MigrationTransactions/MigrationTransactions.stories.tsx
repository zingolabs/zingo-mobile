import type { Meta, StoryObj } from '@storybook/react-native';
import { ZingoError } from 'zingo-ffi';
import { RouteEnum } from '@app/AppState';
import MigrationTransactions from './MigrationTransactions';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withWallet,
} from '../../.storybook/storyDecorators';
import { mockInfo, mockTotalBalance } from '../../.storybook/storyMocks';
import { answer, pending, rejection } from '../../.storybook/storyRpc';
import {
  drainPlan,
  emptyDrainPlan,
  pendingDrainPlan,
} from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationTransactions> = {
  title: 'Migration/Transactions',
  component: MigrationTransactions,
  decorators: [
    withAppContext({ info: mockInfo, totalBalance: mockTotalBalance }),
    withNavigation,
  ],
  args: screenProps(RouteEnum.MigrationTransactions),
};

export default meta;
type Story = StoryObj<typeof MigrationTransactions>;

export const Plan: Story = {
  decorators: [withWallet({ planDrain: answer(drainPlan) })],
};
export const Loading: Story = {
  decorators: [withWallet({ planDrain: pending })],
};
// Nothing to build yet while Orchard still holds funds: notes are confirming.
export const Pending: Story = {
  decorators: [withWallet({ planDrain: answer(pendingDrainPlan) })],
};
export const Empty: Story = {
  decorators: [withWallet({ planDrain: answer(emptyDrainPlan) })],
};
export const Error: Story = {
  decorators: [withWallet({ planDrain: rejection(new ZingoError.Offline()) })],
};
