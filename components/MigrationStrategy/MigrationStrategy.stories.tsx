import type { Meta, StoryObj } from '@storybook/react-native';
import { RouteEnum } from '../../app/AppState';
import MigrationStrategy from './MigrationStrategy';
import {
  screenProps,
  withAppContext,
  withBottomSheet,
  withNavigation,
} from '../storyDecorators';
import { mockInfo, mockTotalBalance } from '../storyMocks';

const meta: Meta<typeof MigrationStrategy> = {
  title: 'Migration/Strategy',
  component: MigrationStrategy,
  decorators: [
    withAppContext({ info: mockInfo, totalBalance: mockTotalBalance }),
    withNavigation,
    withBottomSheet,
  ],
  args: screenProps(RouteEnum.MigrationStrategy),
};

export default meta;
type Story = StoryObj<typeof MigrationStrategy>;

export const Default: Story = {};
