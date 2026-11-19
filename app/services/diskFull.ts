import type { TranslateType } from '@app/AppState';
import type { FfiResult } from '@app/walletBackend/ffi';
import { showConfirm } from './showConfirm';

/** Whether a native result failed because the storage refused the save. */
export const isDiskFull = <T>(result: FfiResult<T>): boolean =>
  !result.ok && result.error.code === 'DiskFull';

/** Asks to try a save again after the storage refused it. */
export const askDiskRetry = (
  translate: (key: string) => TranslateType,
  retry: () => void,
): void =>
  showConfirm({
    title: translate('disk.fail-title') as string,
    message: translate('disk.fail-body') as string,
    buttons: [
      { text: translate('disk.retry') as string, onPress: retry },
      { text: translate('cancel') as string, style: 'cancel' },
    ],
  });
