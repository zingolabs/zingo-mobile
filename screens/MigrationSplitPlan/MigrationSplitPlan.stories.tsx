import type { Meta, StoryObj } from '@storybook/react-native';
import { balanceAtom } from '@app/AppState/balance';
import { seed } from '../../.storybook/storeWith';
import { RouteEnum } from '@app/AppState';
import MigrationSplitPlan from './MigrationSplitPlan';
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
  dustPlan,
  readyPlan,
  splitPlan,
} from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationSplitPlan> = {
  title: 'Migration/SplitPlan',
  component: MigrationSplitPlan,
  decorators: [
    withAppContext({ info: mockInfo }),
    withAtoms(seed(balanceAtom, polledMockBalance)),
    withNavigation,
  ],
  args: screenProps(RouteEnum.MigrationSplitPlan),
};

export default meta;
type Story = StoryObj<typeof MigrationSplitPlan>;

export const Plan: Story = {
  decorators: [withRpc({ planIronwoodMigrationProcess: json(splitPlan) })],
};
// Notes already part-sized: no splitting rounds to run.
export const AlreadySplit: Story = {
  decorators: [withRpc({ planIronwoodMigrationProcess: json(readyPlan) })],
};
export const Loading: Story = {
  decorators: [withRpc({ planIronwoodMigrationProcess: pending })],
};
export const Empty: Story = {
  decorators: [withRpc({ planIronwoodMigrationProcess: json(dustPlan) })],
};
export const Error: Story = {
  decorators: [
    withRpc({
      planIronwoodMigrationProcess: rejection('wallet is offline', 'Offline'),
    }),
  ],
};
