import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '@app/AppState';
import MigrationBatchSending from './MigrationBatchSending';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withRpc,
} from '../../.storybook/storyDecorators';
import { json, pending } from '../../.storybook/storyRpc';
import {
  batchSpacing,
  dueNowStatus,
  haltedBatch,
  skippedBatch,
} from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationBatchSending> = {
  title: 'Migration/BatchSending',
  component: MigrationBatchSending,
  decorators: [withAppContext(), withNavigation],
  args: screenProps(RouteEnum.MigrationBatchSending, {
    denominations: dueNowStatus.due_now?.denominations,
  }),
};

export default meta;
type Story = StoryObj<typeof MigrationBatchSending>;

// The batch call stays in flight while the status poll reports progress.
export const Sending: Story = {
  decorators: [
    withRpc({
      executeDuePartsProcess: pending,
      executeDuePartsStatusProcess: json(batchSpacing),
    }),
  ],
};
// Every part slid or was not yet due: nothing broadcast, nothing lost.
export const NotSendable: Story = {
  decorators: [
    withRpc({
      executeDuePartsProcess: json(skippedBatch),
      executeDuePartsStatusProcess: 'null',
    }),
  ],
};
// A submission failed partway; the un-sent parts remain due.
export const Halted: Story = {
  decorators: [
    withRpc({
      executeDuePartsProcess: json(haltedBatch),
      executeDuePartsStatusProcess: 'null',
    }),
  ],
};
