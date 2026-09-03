import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '@app/AppState';
import MigrationSchedule from './MigrationSchedule';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withRpc,
} from '../../.storybook/storyDecorators';
import { mockInfo } from '../../.storybook/storyMocks';
import { json, pending, rejection } from '../../.storybook/storyRpc';
import {
  dueNowStatus,
  scheduledStatus,
} from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationSchedule> = {
  title: 'Migration/Schedule',
  component: MigrationSchedule,
  decorators: [withAppContext({ info: mockInfo }), withNavigation],
  args: screenProps(RouteEnum.MigrationSchedule, { perBucket: 2 }),
};

export default meta;
type Story = StoryObj<typeof MigrationSchedule>;

// The first batch leaves on confirm; the rest wait for their windows.
export const FirstBatchDue: Story = {
  decorators: [withRpc({ migrationStatusProcess: json(dueNowStatus) })],
};
export const AllUpcoming: Story = {
  decorators: [withRpc({ migrationStatusProcess: json(scheduledStatus) })],
};
export const Loading: Story = {
  decorators: [withRpc({ migrationStatusProcess: pending })],
};
export const Error: Story = {
  decorators: [
    withRpc({
      migrationStatusProcess: rejection(
        'no migration in progress',
        'MigrationNotInProgress',
      ),
    }),
  ],
};
