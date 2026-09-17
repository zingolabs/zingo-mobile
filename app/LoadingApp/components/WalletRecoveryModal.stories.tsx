import type { Meta, StoryObj } from '@storybook/react-native';
import WalletRecoveryModal from './WalletRecoveryModal';
import {
  mockTranslate,
  withBottomSheet,
} from '../../../.storybook/storyDecorators';

const DIAGNOSIS = ['wallet.dat: encrypted twice', 'wallet.backup.dat: ok'].join(
  '\n',
);

const shared = {
  title: mockTranslate('loadingapp.readingwallet-label') as string,
  message: mockTranslate('loadingapp.walletrecovery-body') as string,
  diagnosisLines: DIAGNOSIS,
  translate: mockTranslate,
  onCopy: () => {},
  onSupport: () => {},
  onCancel: () => {},
};

const meta: Meta<typeof WalletRecoveryModal> = {
  title: 'WalletRecovery/WalletRecoveryModal',
  component: WalletRecoveryModal,
  tags: ['static'],
  decorators: [withBottomSheet],
};

export default meta;
type Story = StoryObj<typeof WalletRecoveryModal>;

export const RestorableBackup: Story = {
  args: { ...shared, visible: true, onRestoreBackup: () => {} },
};

export const NoBackup: Story = {
  args: {
    ...shared,
    visible: true,
    diagnosisLines: 'wallet.dat: cannot be decrypted (device key lost)',
    onRestoreBackup: undefined,
  },
};
