import type { Meta, StoryObj } from '@storybook/react-native';
import { ZingoError } from 'zingo-ffi';
import { RouteEnum } from '@app/AppState';
import MigrationSplitPlan from './MigrationSplitPlan';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withWallet,
} from '../../.storybook/storyDecorators';
import { mockInfo, mockTotalBalance } from '../../.storybook/storyMocks';
import { answer, pending, rejection } from '../../.storybook/storyRpc';
import {
  dustPlan,
  readyPlan,
  splitPlan,
} from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationSplitPlan> = {
  title: 'Migration/SplitPlan',
  component: MigrationSplitPlan,
  decorators: [
    withAppContext({ info: mockInfo, totalBalance: mockTotalBalance }),
    withNavigation,
  ],
  args: screenProps(RouteEnum.MigrationSplitPlan),
};

export default meta;
type Story = StoryObj<typeof MigrationSplitPlan>;

export const Plan: Story = {
  decorators: [withWallet({ planMigration: answer(splitPlan) })],
};
// Notes already part-sized: no splitting rounds to run.
export const AlreadySplit: Story = {
  decorators: [withWallet({ planMigration: answer(readyPlan) })],
};
export const Loading: Story = {
  decorators: [withWallet({ planMigration: pending })],
};
export const Empty: Story = {
  decorators: [withWallet({ planMigration: answer(dustPlan) })],
};
export const Error: Story = {
  decorators: [
    withWallet({ planMigration: rejection(new ZingoError.Offline()) }),
  ],
};
