import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '@app/AppState';
import MigrationStatus from './MigrationStatus';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withRpc,
} from '../../.storybook/storyDecorators';
import { mockInfo } from '../../.storybook/storyMocks';
import { json, pending, rejection } from '../../.storybook/storyRpc';
import {
  completeStatus,
  confirmingStatus,
  dueNowStatus,
  scheduledStatus,
  stalledStatus,
} from '../../.storybook/migrationFixtures';

const reconciled = json({ reconciled: true });

const meta: Meta<typeof MigrationStatus> = {
  title: 'Migration/Status',
  component: MigrationStatus,
  decorators: [withAppContext({ info: mockInfo }), withNavigation],
  args: screenProps(RouteEnum.MigrationStatus),
};

export default meta;
type Story = StoryObj<typeof MigrationStatus>;

export const Scheduled: Story = {
  decorators: [
    withRpc({
      reconcileMigrationProcess: reconciled,
      migrationStatusProcess: json(scheduledStatus),
    }),
  ],
};
// The chain is inside a window: the Send Batch action shows.
export const BatchDue: Story = {
  decorators: [
    withRpc({
      reconcileMigrationProcess: reconciled,
      migrationStatusProcess: json(dueNowStatus),
    }),
  ],
};
export const Confirming: Story = {
  decorators: [
    withRpc({
      reconcileMigrationProcess: reconciled,
      migrationStatusProcess: json(confirmingStatus),
    }),
  ],
};
export const Complete: Story = {
  decorators: [
    withRpc({
      reconcileMigrationProcess: reconciled,
      migrationStatusProcess: json(completeStatus),
    }),
  ],
};
// Scheduled with no parts bound: the only exit is to start over.
export const Stalled: Story = {
  decorators: [
    withRpc({
      reconcileMigrationProcess: reconciled,
      migrationStatusProcess: json(stalledStatus),
    }),
  ],
};
export const Loading: Story = {
  decorators: [
    withRpc({
      reconcileMigrationProcess: reconciled,
      migrationStatusProcess: pending,
    }),
  ],
};
export const Error: Story = {
  decorators: [
    withRpc({
      reconcileMigrationProcess: reconciled,
      migrationStatusProcess: rejection('wallet is offline', 'Offline'),
    }),
  ],
};
