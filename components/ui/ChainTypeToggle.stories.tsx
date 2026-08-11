import type { Meta, StoryObj } from '@storybook/react-native';
import { ChainNameEnum } from '../../app/AppState';
import ChainTypeToggle from './ChainTypeToggle';
import { mockTranslate } from '../storyDecorators';

const meta: Meta<typeof ChainTypeToggle> = {
  title: 'Components/ChainTypeToggle',
  component: ChainTypeToggle,
  args: {
    customServerChainName: ChainNameEnum.mainChainName,
    onPress: () => {},
    translate: mockTranslate,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof ChainTypeToggle>;

export const Mainnet: Story = {};
export const Testnet: Story = {
  args: { customServerChainName: ChainNameEnum.testChainName },
};
export const Disabled: Story = { args: { disabled: true } };
