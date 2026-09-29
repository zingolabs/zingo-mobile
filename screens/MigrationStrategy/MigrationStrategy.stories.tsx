import type { Meta, StoryObj } from '@storybook/react-native';
import { balanceAtom } from '@app/AppState/balance';
import { seed } from '../../.storybook/storeWith';
import { RouteEnum } from '@app/AppState';
import MigrationStrategy from './MigrationStrategy';
import {
  screenProps,
  withAppContext,
  withAtoms,
  withBottomSheet,
  withNavigation,
} from '../../.storybook/storyDecorators';
import {
  mixnetConnecting,
  mixnetLost,
  mockInfo,
  polledMockBalance,
} from '../../.storybook/storyMocks';

const meta: Meta<typeof MigrationStrategy> = {
  title: 'Migration/Strategy',
  component: MigrationStrategy,
  decorators: [
    withAppContext({ info: mockInfo }),
    withAtoms(seed(balanceAtom, polledMockBalance)),
    withNavigation,
    withBottomSheet,
  ],
  args: { ...screenProps(RouteEnum.MigrationStrategy), nymSheetOpen: false },
  argTypes: { nymSheetOpen: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof MigrationStrategy>;

export const Default: Story = {};

export const NymSheetOpen: Story = {
  tags: ['static'],
  args: { nymSheetOpen: true },
};

export const NymSheetConnecting: Story = {
  tags: ['static'],
  args: { nymSheetOpen: true },
  decorators: [
    withAppContext({
      info: mockInfo,
      mixnetView: mixnetConnecting,
    }),
  ],
};

export const NymSheetLost: Story = {
  tags: ['static'],
  args: { nymSheetOpen: true },
  decorators: [
    withAppContext({
      info: mockInfo,
      mixnetView: mixnetLost,
    }),
  ],
};
