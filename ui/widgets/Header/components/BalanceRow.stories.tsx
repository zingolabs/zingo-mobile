import type { Meta, StoryObj } from '@storybook/react-native';
import { balanceAtom } from '@app/AppState/balance';
import { seed } from '../../../../.storybook/storeWith';
import { SelectServerEnum } from '@app/AppState';
import BalanceRow from './BalanceRow';
import {
  mockTranslate,
  withAppContext,
  withAtoms,
  withNavigation,
} from '../../../../.storybook/storyDecorators';
import {
  mockInfo,
  mockZecPrice,
  polledMockBalance,
} from '../../../../.storybook/storyMocks';

// BalanceRow nests PriceFetcher (context) and navigates on tap (navigation). It needs both decorators
const meta: Meta<typeof BalanceRow> = {
  title: 'Header/BalanceRow',
  component: BalanceRow,
  decorators: [
    withAppContext(),
    withAtoms(seed(balanceAtom, polledMockBalance)),
    withNavigation,
  ],
  args: {
    noBalance: false,
    noPrivacy: false,
    setPrivacyOption: async () => {},
    addLastSnackbar: () => {},
    privacy: false,
    translate: mockTranslate,
    info: mockInfo,
    zecPrice: mockZecPrice,
    selectServer: SelectServerEnum.auto,
    showShieldButton: false,
    shieldingFee: 0,
    valueTransfersTotal: 12,
    calculateAmountToShield: () => '0',
    calculatePoolsToShield: () => '',
    calculateDisableButtonToShield: () => true,
    onPressShieldFunds: () => {},
    receivedLegend: false,
  },
};

export default meta;
type Story = StoryObj<typeof BalanceRow>;

export const Default: Story = {};
export const Private: Story = { args: { privacy: true } };
export const WithShield: Story = {
  args: {
    showShieldButton: true,
    calculateDisableButtonToShield: () => false,
    calculateAmountToShield: () => '0.5',
  },
};
