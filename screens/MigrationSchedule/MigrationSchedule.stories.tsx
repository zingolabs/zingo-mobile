import type { Meta, StoryObj } from '@storybook/react-native';
import { ZingoError } from 'zingo-ffi';
import { RouteEnum } from '@app/AppState';
import MigrationSchedule from './MigrationSchedule';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withWallet,
} from '../../.storybook/storyDecorators';
import { mockInfo } from '../../.storybook/storyMocks';
import { answer, pending, rejection } from '../../.storybook/storyRpc';
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
  decorators: [withWallet({ migrationStatus: answer(dueNowStatus) })],
};
export const AllUpcoming: Story = {
  decorators: [withWallet({ migrationStatus: answer(scheduledStatus) })],
};
export const Loading: Story = {
  decorators: [withWallet({ migrationStatus: pending })],
};
export const Error: Story = {
  decorators: [
    withWallet({
      migrationStatus: rejection(new ZingoError.MigrationNotInProgress()),
    }),
  ],
};
