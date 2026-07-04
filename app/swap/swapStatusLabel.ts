import { SwapStatusEnum } from './enums/SwapStatusEnum';

/**
 * Project the granular `SwapStatusEnum` (10 values) to a human-readable
 * label via i18n. Shared between the SwapDetail status block and the
 * History row's in-flight status sub-line so the two surfaces agree
 * verbatim — when the user sees "Awaiting external deposit" in the
 * History row and taps into SwapDetail, the same words appear inside
 * the status box, no translation drift between screens.
 *
 * Each enum value gets its own i18n key so translations can shade the
 * differences (e.g. `processing` vs `pending` vs `awaiting-external-deposit`)
 * for the user — collapsing them into a single "in progress" would lose
 * the signal the SwapDetail screen was designed to surface.
 */
export function swapStatusLabel(
  status: SwapStatusEnum,
  translate: (key: string) => string | object,
): string {
  switch (status) {
    case SwapStatusEnum.AwaitingExternalDeposit:
      return translate('swapdetail.status-awaiting-external') as string;
    case SwapStatusEnum.PendingDeposit:
      return translate('swapdetail.status-pending-deposit') as string;
    case SwapStatusEnum.Pending:
      return translate('swapdetail.status-pending') as string;
    case SwapStatusEnum.Processing:
      return translate('swapdetail.status-processing') as string;
    case SwapStatusEnum.Completed:
      return translate('swapdetail.status-completed') as string;
    case SwapStatusEnum.Failed:
      return translate('swapdetail.status-failed') as string;
    case SwapStatusEnum.Refunded:
      return translate('swapdetail.status-refunded') as string;
    case SwapStatusEnum.Expired:
      return translate('swapdetail.status-expired') as string;
    case SwapStatusEnum.IncompleteDeposit:
      return translate('swapdetail.status-incomplete-deposit') as string;
    case SwapStatusEnum.ProviderStatusUnknown:
    default:
      return translate('swapdetail.status-unknown') as string;
  }
}
