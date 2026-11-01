import { SwapStatusEnum } from './enums/SwapStatusEnum';

/**
 * The history row's label for a swap.
 *
 * `Utils.VTTypeWithConfirmations` reads the five-value transfer status, which
 * cannot separate a swap still awaiting its deposit from one the provider is
 * already processing. The row reads the record's own status instead, so the
 * distinctions the poller works to observe reach the list.
 *
 * The mobile wallet's `swapStatusLabel` covers the same ground through i18n
 * keys. zingo-pc ships English strings, so this states them directly rather
 * than routing through a translation shim that would only ever return one
 * language.
 *
 * An unset or unrecognised status falls back to the plain kind, which is what
 * a record written by a newer version would produce.
 */
export function swapRowLabel(swapStatus?: string): string {
  switch (swapStatus) {
    case SwapStatusEnum.AwaitingExternalDeposit:
      return 'Awaiting deposit';
    case SwapStatusEnum.PendingDeposit:
      return '...Depositing...';
    case SwapStatusEnum.IncompleteDeposit:
      return 'Incomplete deposit';
    case SwapStatusEnum.Pending:
      return '...Swapping...';
    case SwapStatusEnum.Processing:
      return '...Processing...';
    case SwapStatusEnum.Completed:
      return 'Swapped';
    case SwapStatusEnum.Failed:
      return 'Swap failed';
    case SwapStatusEnum.Refunded:
      return 'Swap refunded';
    case SwapStatusEnum.Expired:
      return 'Swap expired';
    case SwapStatusEnum.ProviderStatusUnknown:
    default:
      return 'Swap';
  }
}
