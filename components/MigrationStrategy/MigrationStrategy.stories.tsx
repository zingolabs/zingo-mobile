import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '../../app/AppState';
import MigrationStrategy from './MigrationStrategy';
import {
  screenProps,
  withAppContext,
  withBottomSheet,
  withNavigation,
} from '../storyDecorators';
import {
  mixnetConnecting,
  mixnetLost,
  mockInfo,
  mockTotalBalance,
} from '../storyMocks';

const meta: Meta<typeof MigrationStrategy> = {
  title: 'Migration/Strategy',
  component: MigrationStrategy,
  decorators: [
    withAppContext({ info: mockInfo, totalBalance: mockTotalBalance }),
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
      totalBalance: mockTotalBalance,
      nym: true,
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
      totalBalance: mockTotalBalance,
      nym: true,
      mixnetView: mixnetLost,
    }),
  ],
};
