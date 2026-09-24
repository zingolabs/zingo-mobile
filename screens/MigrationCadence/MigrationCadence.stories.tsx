import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '@app/AppState';
import MigrationCadence from './MigrationCadence';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withRpc,
} from '../../.storybook/storyDecorators';
import { json, pending, rejection } from '../../.storybook/storyRpc';
import {
  dustPlan,
  idleStatus,
  readyPlan,
  unconfirmedPlan,
} from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationCadence> = {
  title: 'Migration/Cadence',
  component: MigrationCadence,
  decorators: [withAppContext(), withNavigation],
  args: screenProps(RouteEnum.MigrationCadence),
};

export default meta;
type Story = StoryObj<typeof MigrationCadence>;

export const Choose: Story = {
  decorators: [
    withRpc({
      migrationStatusProcess: json(idleStatus),
      planIronwoodMigrationProcess: json(readyPlan),
    }),
  ],
};
// Every note sits below the sweep floor: nothing to schedule.
export const Dust: Story = {
  decorators: [
    withRpc({
      migrationStatusProcess: json(idleStatus),
      planIronwoodMigrationProcess: json(dustPlan),
    }),
  ],
};
// The split outputs are mined but not yet spendable at the anchor.
export const Unconfirmed: Story = {
  decorators: [
    withRpc({
      migrationStatusProcess: json(idleStatus),
      planIronwoodMigrationProcess: json(unconfirmedPlan),
    }),
  ],
};
export const Loading: Story = {
  decorators: [
    withRpc({
      migrationStatusProcess: pending,
      planIronwoodMigrationProcess: pending,
    }),
  ],
};
export const Error: Story = {
  decorators: [
    withRpc({
      migrationStatusProcess: rejection('wallet is offline', 'Offline'),
      planIronwoodMigrationProcess: json(readyPlan),
    }),
  ],
};
