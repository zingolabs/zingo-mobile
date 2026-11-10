import type { Meta, StoryObj } from '@storybook/react-native';
import { Route } from '@app/AppState';
import { ValueTransferType, ValueTransferStatus } from '@app/wallet/transfer';
import ComputingTxContent from './ComputingTxContent';
import {
  screenProps,
  withAppContext,
  withBottomSheet,
  withNavigation,
} from '../../.storybook/storyDecorators';

const meta: Meta<typeof ComputingTxContent> = {
  title: 'LoadedApp/ComputingTx',
  component: ComputingTxContent,
  decorators: [withAppContext(), withNavigation, withBottomSheet],
  args: screenProps(Route.Computing),
};

export default meta;
type Story = StoryObj<typeof ComputingTxContent>;

/**
 * Static as the others: the screen is a full panel (a sheet) that measures
 * on a real rendering step, so its capture needs the frame-by-frame play.
 * The capture also reduces motion, so the flight's loop rests on its end
 * frame instead of the frame the mount happened to land on.
 */
export const Computing: Story = { tags: ['static'] };

export const Created: Story = {
  tags: ['static'],
  args: screenProps(Route.Computing, { phase: 'created', txids: [] }),
};

export const Failed: Story = {
  tags: ['static'],
  args: screenProps(Route.Computing, {
    phase: 'failed',
    stage: 'create',
    since: 0,
    failure: {
      kind: 'verbatim',
      text: 'Insufficient balance to cover the fee.',
    },
  }),
};

const subject = {
  amount: '0.2500',
  who: 'Irene',
  kind: 'send' as const,
  pair: false,
};
const tx = (
  txid: string,
  status: ValueTransferStatus,
  confirmations = 0,
  kind = 'Sent',
): ValueTransferType =>
  ({
    txid,
    kind,
    status,
    confirmations,
    time: 1,
    amount: 0.25,
    blockheight: 0,
    address: 'u1irene',
  }) as ValueTransferType;

export const InMempool: Story = {
  tags: ['static'],
  decorators: [
    withAppContext({
      valueTransfers: [tx('abc', 'mempool')],
    }),
  ],
  args: screenProps(Route.Computing, {
    phase: 'created',
    txids: ['abc'],
    subject,
  }),
};

export const Confirming: Story = {
  tags: ['static'],
  decorators: [
    withAppContext({
      valueTransfers: [tx('abc', 'confirmed', 2)],
    }),
  ],
  args: screenProps(Route.Computing, {
    phase: 'created',
    txids: ['abc'],
    subject,
  }),
};

export const TexInMempool: Story = {
  tags: ['static'],
  decorators: [
    withAppContext({
      valueTransfers: [
        tx('hop', 'mempool', 0, 'SendToSelf'),
        tx('pay', 'mempool'),
      ],
    }),
  ],
  args: screenProps(Route.Computing, {
    phase: 'created',
    txids: ['hop', 'pay'],
    subject: { ...subject, pair: true },
  }),
};

export const FailedSending: Story = {
  tags: ['static'],
  decorators: [
    withAppContext({
      valueTransfers: [tx('abc', 'failed')],
    }),
  ],
  args: screenProps(Route.Computing, {
    phase: 'failed',
    stage: 'send',
    since: 0,
    subject,
  }),
};
