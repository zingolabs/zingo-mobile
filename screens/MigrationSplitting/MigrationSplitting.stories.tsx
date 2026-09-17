import type { Meta, StoryObj } from '@storybook/react-native';
import { SplitOutcome, ZingoError } from 'zingo-ffi';
import { RouteEnum } from '@app/AppState';
import { transformMigrationPlan } from '@app/walletBackend/transforms/migrationTransform';
import MigrationSplitting from './MigrationSplitting';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withWallet,
} from '../../.storybook/storyDecorators';
import { answer, pending, rejection } from '../../.storybook/storyRpc';
import { splitPlan, txids } from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationSplitting> = {
  title: 'Migration/Splitting',
  component: MigrationSplitting,
  decorators: [withAppContext(), withNavigation],
  args: screenProps(RouteEnum.MigrationSplitting, {
    plan: transformMigrationPlan(splitPlan),
  }),
};

export default meta;
type Story = StoryObj<typeof MigrationSplitting>;

// The first round broadcast, then the loop waits on its confirmation.
export const Awaiting: Story = {
  decorators: [
    withWallet({
      splitRound: (call: number) =>
        call === 0
          ? new SplitOutcome.Round({ txids: [txids[0]] })
          : new SplitOutcome.AwaitingConfirmation(),
    }),
  ],
};
export const Proving: Story = {
  decorators: [withWallet({ splitRound: pending })],
};
export const Complete: Story = {
  decorators: [withWallet({ splitRound: answer(new SplitOutcome.Complete()) })],
};
export const Error: Story = {
  decorators: [
    withWallet({
      splitRound: rejection(
        new ZingoError.MigrationSplitFailed({
          detail: 'not enough confirmed notes to split',
        }),
      ),
    }),
  ],
};
