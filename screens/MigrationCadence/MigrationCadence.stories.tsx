import type { Meta, StoryObj } from '@storybook/react-native';
import { ZingoError } from 'zingo-ffi';
import { RouteEnum } from '@app/AppState';
import MigrationCadence from './MigrationCadence';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withWallet,
} from '../../.storybook/storyDecorators';
import { answer, pending, rejection } from '../../.storybook/storyRpc';
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
    withWallet({
      migrationStatus: answer(idleStatus),
      planMigration: answer(readyPlan),
    }),
  ],
};
// Every note sits below the sweep floor: nothing to schedule.
export const Dust: Story = {
  decorators: [
    withWallet({
      migrationStatus: answer(idleStatus),
      planMigration: answer(dustPlan),
    }),
  ],
};
// The split outputs are mined but not yet spendable at the anchor.
export const Unconfirmed: Story = {
  decorators: [
    withWallet({
      migrationStatus: answer(idleStatus),
      planMigration: answer(unconfirmedPlan),
    }),
  ],
};
export const Loading: Story = {
  decorators: [
    withWallet({ migrationStatus: pending, planMigration: pending }),
  ],
};
export const Error: Story = {
  decorators: [
    withWallet({
      migrationStatus: rejection(new ZingoError.Offline()),
      planMigration: answer(readyPlan),
    }),
  ],
};
