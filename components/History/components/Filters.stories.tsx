import type { Meta, StoryObj } from '@storybook/react-native';
import { FilterEnum } from '../../../app/AppState';
import Filters from './Filters';
import { withAppContext } from '../../storyDecorators';

const meta: Meta<typeof Filters> = {
  title: 'History/Filters',
  component: Filters,
  decorators: [withAppContext()],
  args: {
    closeSheet: () => {},
    filterKind: FilterEnum.all,
    setFilterKind: () => {},
    filterFailed: false,
    setFilterFailed: () => {},
    filterMemos: false,
    setFilterMemos: () => {},
    filterWithFunds: false,
    setFilterWithFunds: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof Filters>;

export const Default: Story = {};
export const MemosAndFunds: Story = {
  args: { filterMemos: true, filterWithFunds: true },
};
