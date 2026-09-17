import type { Meta, StoryObj } from '@storybook/react-native';
import { ZingoError } from 'zingo-ffi';
import { RouteEnum } from '@app/AppState';
import { transformDrainPlan } from '@app/walletBackend/transforms/migrationTransform';
import MigrationSending from './MigrationSending';
import {
  screenProps,
  withAppContext,
  withNavigation,
  withWallet,
} from '../../.storybook/storyDecorators';
import { mockInfo } from '../../.storybook/storyMocks';
import { pending, rejection } from '../../.storybook/storyRpc';
import { drainPlan } from '../../.storybook/migrationFixtures';

const meta: Meta<typeof MigrationSending> = {
  title: 'Migration/Sending',
  component: MigrationSending,
  decorators: [withAppContext({ info: mockInfo }), withNavigation],
  args: screenProps(RouteEnum.MigrationSending, {
    transactions: transformDrainPlan(drainPlan).transactions,
  }),
};

export default meta;
type Story = StoryObj<typeof MigrationSending>;

// The drain call stays in flight; progress arrives through DrainProgress events.
export const Building: Story = {
  decorators: [withWallet({ drain: pending })],
};
export const Error: Story = {
  decorators: [
    withWallet({
      drain: rejection(
        new ZingoError.TransmissionFailed({
          detail: 'broadcast refused: mempool full',
        }),
      ),
    }),
  ],
};
