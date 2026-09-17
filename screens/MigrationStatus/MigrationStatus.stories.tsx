import type { Meta, StoryObj } from '@storybook/react-native';
import { ZingoError } from 'zingo-ffi';
import { RouteEnum } from '@app/AppState';
import MigrationStatus from './MigrationStatus';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withWallet,
} from '../../.storybook/storyDecorators';
import { mockInfo } from '../../.storybook/storyMocks';
import { answer, pending, rejection } from '../../.storybook/storyRpc';
import {
  completeStatus,
  confirmingStatus,
  dueNowStatus,
  scheduledStatus,
  stalledStatus,
} from '../../.storybook/migrationFixtures';

const reconciled = answer([]);

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
    withWallet({
      reconcileMigration: reconciled,
      migrationStatus: answer(scheduledStatus),
    }),
  ],
};
// The chain is inside a window: the Send Batch action shows.
export const BatchDue: Story = {
  decorators: [
    withWallet({
      reconcileMigration: reconciled,
      migrationStatus: answer(dueNowStatus),
    }),
  ],
};
export const Confirming: Story = {
  decorators: [
    withWallet({
      reconcileMigration: reconciled,
      migrationStatus: answer(confirmingStatus),
    }),
  ],
};
export const Complete: Story = {
  decorators: [
    withWallet({
      reconcileMigration: reconciled,
      migrationStatus: answer(completeStatus),
    }),
  ],
};
// Scheduled with no parts bound: the only exit is to start over.
export const Stalled: Story = {
  decorators: [
    withWallet({
      reconcileMigration: reconciled,
      migrationStatus: answer(stalledStatus),
    }),
  ],
};
export const Loading: Story = {
  decorators: [
    withWallet({ reconcileMigration: reconciled, migrationStatus: pending }),
  ],
};
export const Error: Story = {
  decorators: [
    withWallet({
      reconcileMigration: reconciled,
      migrationStatus: rejection(new ZingoError.Offline()),
    }),
  ],
};
