import type { Meta, StoryObj } from '@storybook/react-native';
import StepperHeader from './StepperHeader';
import { withAppContext } from '../storyDecorators';

const meta: Meta<typeof StepperHeader> = {
  title: 'Migration/StepperHeader',
  component: StepperHeader,
  decorators: [withAppContext()],
  args: { splitDone: false, sendActive: false },
};

export default meta;
type Story = StoryObj<typeof StepperHeader>;

export const Splitting: Story = {};
export const Sending: Story = { args: { splitDone: true, sendActive: true } };
