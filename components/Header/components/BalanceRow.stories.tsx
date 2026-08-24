import type { Meta, StoryObj } from '@storybook/react-native';
import {
  CurrencyEnum,
  ModeEnum,
  SelectServerEnum,
} from '../../../app/AppState';
import BalanceRow from './BalanceRow';
import {
  mockTranslate,
  withAppContext,
  withNavigation,
} from '../../storyDecorators';
import { mockInfo, mockTotalBalance, mockZecPrice } from '../../storyMocks';

// BalanceRow nests PriceFetcher (context) and navigates on tap (navigation). It needs both decorators
const meta: Meta<typeof BalanceRow> = {
  title: 'Header/BalanceRow',
  component: BalanceRow,
  decorators: [withAppContext(), withNavigation],
  args: {
    noBalance: false,
    mode: ModeEnum.advanced,
    noPrivacy: false,
    setPrivacyOption: async () => {},
    addLastSnackbar: () => {},
    privacy: false,
    translate: mockTranslate,
    totalBalance: mockTotalBalance,
    info: mockInfo,
    currency: CurrencyEnum.USDCurrency,
    zecPrice: mockZecPrice,
    setZecPrice: () => {},
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
