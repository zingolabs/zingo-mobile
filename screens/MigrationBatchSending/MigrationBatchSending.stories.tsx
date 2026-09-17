import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '@app/AppState';
import MigrationBatchSending from './MigrationBatchSending';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withWallet,
} from '../../.storybook/storyDecorators';
import { answer, pending } from '../../.storybook/storyRpc';
import {
  dueNowDenominations,
  haltedBatch,
  skippedBatch,
} from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationBatchSending> = {
  title: 'Migration/BatchSending',
  component: MigrationBatchSending,
  decorators: [withAppContext(), withNavigation],
  args: screenProps(RouteEnum.MigrationBatchSending, {
    denominations: dueNowDenominations,
  }),
};

export default meta;
type Story = StoryObj<typeof MigrationBatchSending>;

// The batch call stays in flight; progress arrives through BatchProgress events.
export const Sending: Story = {
  decorators: [withWallet({ executeDueParts: pending })],
};
// Every part slid or was not yet due: nothing broadcast, nothing lost.
export const NotSendable: Story = {
  decorators: [withWallet({ executeDueParts: answer(skippedBatch) })],
};
// A submission failed partway; the un-sent parts remain due.
export const Halted: Story = {
  decorators: [withWallet({ executeDueParts: answer(haltedBatch) })],
};
