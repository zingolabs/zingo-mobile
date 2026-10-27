import type { Meta, StoryObj } from '@storybook/react-native';
import type { SwapAssetType } from '@app/swap';
import SwapFlight from './SwapFlight';

const ZEC: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

const BTC: SwapAssetType = {
  swapKitId: 'BTC.BTC',
  chain: 'BTC',
  symbol: 'BTC',
  ticker: 'BTC',
  chainId: 'bitcoin',
  decimals: 8,
};

const meta: Meta<typeof SwapFlight> = {
  title: 'Components/SwapFlight',
  component: SwapFlight,
  args: { from: BTC, to: ZEC, provider: 'NEAR', nym: false },
  /** Its loops settle on their end frame in the visual capture. */
  tags: ['loop'],
};

export default meta;
type Story = StoryObj<typeof SwapFlight>;

/** Buying ZEC, the payment seen: the token travels. */
export const Buying: Story = {};
/** Buying ZEC, the payment not seen yet: the BTC breathes, nothing travels. */
export const WaitingForPayment: Story = { args: { waiting: true } };
/** Selling ZEC through the mixnet. */
export const Selling: Story = {
  args: { from: ZEC, to: BTC, nym: true },
};
