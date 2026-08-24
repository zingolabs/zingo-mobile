import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '../../app/AppState';
import MigrationSplitting from './MigrationSplitting';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withRpc,
} from '../storyDecorators';
import { json, pending, rejection } from '../storyRpc';
import { splitPlan, txids } from '../Migration/migrationFixtures';

const meta: Meta<typeof MigrationSplitting> = {
  title: 'Migration/Splitting',
  component: MigrationSplitting,
  decorators: [withAppContext(), withNavigation],
  args: screenProps(RouteEnum.MigrationSplitting, { plan: splitPlan }),
};

export default meta;
type Story = StoryObj<typeof MigrationSplitting>;

// The first round broadcast, then the loop waits on its confirmation.
export const Awaiting: Story = {
  decorators: [
    withRpc({
      quickSplitProcess: call =>
        call === 0
          ? json({ outcome: 'round', txids: [txids[0]] })
          : json({ outcome: 'awaiting_confirmation' }),
    }),
  ],
};
export const Proving: Story = {
  decorators: [withRpc({ quickSplitProcess: pending })],
};
export const Complete: Story = {
  decorators: [withRpc({ quickSplitProcess: json({ outcome: 'complete' }) })],
};
export const Error: Story = {
  decorators: [
    withRpc({
      quickSplitProcess: rejection(
        'not enough confirmed notes to split',
        'MigrationSplit',
      ),
    }),
  ],
};
