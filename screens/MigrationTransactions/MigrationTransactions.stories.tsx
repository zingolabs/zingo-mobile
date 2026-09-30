import type { Meta, StoryObj } from '@storybook/react-native';
import { balanceAtom } from '@app/AppState/balance';
import { seed } from '../../.storybook/storeWith';
import { RouteEnum } from '@app/AppState';
import MigrationTransactions from './MigrationTransactions';
import {
  screenProps,
  withAppContext,
  withAtoms,
  withNavigation,
  withRpc,
} from '../../.storybook/storyDecorators';
import { mockInfo, polledMockBalance } from '../../.storybook/storyMocks';
import { json, pending, rejection } from '../../.storybook/storyRpc';
import {
  drainPlan,
  emptyDrainPlan,
  pendingDrainPlan,
} from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationTransactions> = {
  title: 'Migration/Transactions',
  component: MigrationTransactions,
  decorators: [
    withAppContext({ info: mockInfo }),
    withAtoms(seed(balanceAtom, polledMockBalance)),
    withNavigation,
  ],
  args: screenProps(RouteEnum.MigrationTransactions),
};

export default meta;
type Story = StoryObj<typeof MigrationTransactions>;

export const Plan: Story = {
  decorators: [withRpc({ planOrchardDrainProcess: json(drainPlan) })],
};
export const Loading: Story = {
  decorators: [withRpc({ planOrchardDrainProcess: pending })],
};
// Nothing to build yet while Orchard still holds funds: notes are confirming.
export const Pending: Story = {
  decorators: [withRpc({ planOrchardDrainProcess: json(pendingDrainPlan) })],
};
export const Empty: Story = {
  decorators: [withRpc({ planOrchardDrainProcess: json(emptyDrainPlan) })],
};
export const Error: Story = {
  decorators: [
    withRpc({
      planOrchardDrainProcess: rejection('wallet is offline', 'Offline'),
    }),
  ],
};
