import React, { useCallback, useEffect, useState } from 'react';
import WalletRecoveryModal from './WalletRecoveryModal';
import {
  registerWalletRecoveryListener,
  WalletRecoveryOptions,
} from '../../app/showWalletRecovery';

// Bridges the imperative showWalletRecovery trigger to the controlled
// modal: an action closes the sheet, Copy leaves it open.
const WalletRecoveryHost: React.FunctionComponent = () => {
  const [options, setOptions] = useState<WalletRecoveryOptions | null>(null);

  useEffect(() => {
    registerWalletRecoveryListener(setOptions);
    return () => registerWalletRecoveryListener(null);
  }, []);

  const close = useCallback((action: () => void) => {
    setOptions(null);
    setTimeout(action, 0);
  }, []);

  return (
    <WalletRecoveryModal
      visible={!!options}
      title={options?.title ?? ''}
      message={options?.message ?? ''}
      diagnosisLines={options?.diagnosisLines ?? ''}
      translate={options?.translate ?? (key => key)}
      onCopy={() => options?.onCopy()}
      onRestoreBackup={
        options?.onRestoreBackup
          ? () => close(options.onRestoreBackup as () => void)
          : undefined
      }
      onSalvageSeed={
        options?.onSalvageSeed
          ? () => close(options.onSalvageSeed as () => void)
          : undefined
      }
      onSupport={() => options && close(options.onSupport)}
      onCancel={() => options && close(options.onCancel)}
      // Clear state on any dismissal, including the Android back button.
      onDismiss={() => setOptions(null)}
    />
  );
};

export default WalletRecoveryHost;
