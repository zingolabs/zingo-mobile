import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '@app/AppState';
import MigrationSending from './MigrationSending';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withRpc,
} from '../../.storybook/storyDecorators';
import { mockInfo } from '../../.storybook/storyMocks';
import { json, pending, rejection } from '../../.storybook/storyRpc';
import { drainBuilding, drainPlan } from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationSending> = {
  title: 'Migration/Sending',
  component: MigrationSending,
  decorators: [withAppContext({ info: mockInfo }), withNavigation],
  args: screenProps(RouteEnum.MigrationSending, {
    transactions: drainPlan.transactions ?? [],
  }),
};

export default meta;
type Story = StoryObj<typeof MigrationSending>;

// The drain call stays in flight while the status poll reports proving.
export const Building: Story = {
  decorators: [
    withRpc({
      drainOrchardProcess: pending,
      drainStatusProcess: json(drainBuilding),
    }),
  ],
};
export const Error: Story = {
  decorators: [
    withRpc({
      drainOrchardProcess: rejection('broadcast refused: mempool full'),
      drainStatusProcess: 'null',
    }),
  ],
};
