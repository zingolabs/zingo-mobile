import type { Meta, StoryObj } from '@storybook/react-native';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import BalanceRow from './BalanceRow';
import {
  mockTranslate,
  withAppContext,
  withNavigation,
} from '../../../../.storybook/storyDecorators';
import {
  mockInfo,
  mockTotalBalance,
  mockZecPrice,
} from '../../../../.storybook/storyMocks';

// BalanceRow nests PriceFetcher (context) and navigates on tap (navigation). It needs both decorators
const meta: Meta<typeof BalanceRow> = {
  title: 'Header/BalanceRow',
  component: BalanceRow,
  decorators: [withAppContext(), withNavigation],
  args: {
    noBalance: false,
    noPrivacy: false,
    setPrivacyOption: async () => {},
    privacy: false,
    translate: mockTranslate,
    totalBalance: mockTotalBalance,
    info: mockInfo,
    zecPrice: mockZecPrice,
    server: remoteServer(mockInfo.serverUri, ChainNameEnum.mainChainName),
    receivedLegend: false,
  },
};

export default meta;
type Story = StoryObj<typeof BalanceRow>;

export const Default: Story = {};
export const Private: Story = { args: { privacy: true } };
