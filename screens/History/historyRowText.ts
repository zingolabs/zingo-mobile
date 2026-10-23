import { ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import {
  SwapDirectionEnum,
  SwapStatusEnum,
  formatAmountForDisplay,
  providerShortLabel,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';

type Translate = (key: string) => string;

/** How a row's figures are coloured: arriving value in green, failure muted. */
export type RowTone = 'default' | 'positive' | 'muted';
/** A state word before the date: in flight, refunded in amber, failed in red. */
export type RowState = { text: string; tone: 'default' | 'warning' | 'danger' };

export type RowText = {
  title: string;
  /** The title is an address, drawn in mono. */
  titleMono: boolean;
  state?: RowState;
  line: string;
  top: string;
  topTone: RowTone;
  bottom: string;
};

const MINUTE_MS = 60_000;

/** "Just now", "12 min ago" within the hour, the day after that. */
export function shortWhen(
  timeMs: number,
  nowMs: number,
  t: Translate,
  formatDay: (ms: number) => string,
): string {
  const minutes = Math.round((nowMs - timeMs) / MINUTE_MS);
  if (minutes < 1) {
    return t('history.just-now');
  }
  if (minutes < 60) {
    return `${minutes} ${t('history.min-ago')}`;
  }
  return formatDay(timeMs);
}

/** Four decimals, the way the list writes ZEC. */
const zec = (amount: number): string => amount.toFixed(4);

/** A transfer's row: what it was, when, and the ZEC with its dollars. */
export function transferRowText(args: {
  vt: ValueTransferType;
  when: string;
  currency: string;
  usd: string;
  t: Translate;
}): RowText {
  const { vt, when, currency, usd, t } = args;
  const failed = vt.status === RPCValueTransfersStatusEnum.failed;
  const pending = !failed && vt.confirmations === 0;
  const state: RowState | undefined = failed
    ? { text: t('history.state-failed'), tone: 'danger' }
    : pending
      ? { text: t(`history.${vt.status}`), tone: 'default' }
      : undefined;
  const amount = `${zec(vt.amount)} ${currency}`;
  const base = { state, bottom: usd, titleMono: false };
  switch (vt.kind) {
    case ValueTransferKindEnum.Sent:
      return {
        ...base,
        title: vt.address ? vt.address : t('history.sent'),
        titleMono: !!vt.address,
        line: `${t('history.sent')} · ${when}`,
        top: `−${amount}`,
        topTone: failed ? 'muted' : 'default',
      };
    case ValueTransferKindEnum.Received:
      return {
        ...base,
        title: t('history.received'),
        line: when,
        top: `+${amount}`,
        topTone: failed ? 'muted' : 'positive',
      };
    case ValueTransferKindEnum.Shield:
      return {
        ...base,
        title: t('history.shield'),
        line: `${t('history.shield-line')} · ${when}`,
        top: amount,
        topTone: failed ? 'muted' : 'default',
      };
    default:
      return {
        ...base,
        title: t(
          vt.kind === ValueTransferKindEnum.SendToSelf
            ? 'history.sendtoself'
            : vt.kind === ValueTransferKindEnum.MemoToSelf
              ? 'history.memotoself'
              : vt.kind === ValueTransferKindEnum.Migration
                ? 'history.migration'
                : vt.kind === ValueTransferKindEnum.Rejection
                  ? 'history.rejection'
                  : 'history.swap',
        ).trim(),
        line: when,
        top: amount,
        topTone: failed ? 'muted' : 'default',
      };
  }
}

const tickerOf = (asset: SwapRecordType['sellAsset']): string =>
  asset.ticker ?? asset.symbol;

/**
 * A swap's row: what it got on top, what left under it. A refund shows what
 * it cost and what came back; a swap still moving says where it stands.
 */
export function swapRowText(args: {
  record: SwapRecordType;
  when: string;
  t: Translate;
}): RowText {
  const { record, when, t } = args;
  const sell = record.direction === SwapDirectionEnum.Outbound;
  const sellSym = tickerOf(record.sellAsset);
  const getSym = tickerOf(record.receiveAsset);
  const other = sell ? getSym : sellSym;
  const sold = `${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${sellSym}`;
  const got = formatAmountForDisplay(
    record.actualReceiveAmount ?? record.expectedReceiveAmount,
  );
  const line = `${providerShortLabel(record.provider)} · ${when}`;
  const toward = `${t(sell ? 'history.swap-to' : 'history.swap-from')} ${other}`;
  const base = { titleMono: false, line };

  switch (record.status) {
    case SwapStatusEnum.Completed:
      return {
        ...base,
        title: `${t(sell ? 'history.swapped-to' : 'history.swapped-from')} ${other}`,
        top: `+${got} ${getSym}`,
        topTone: 'positive',
        bottom: `−${sold}`,
      };
    case SwapStatusEnum.Refunded: {
      const back = record.refundInfo?.refundedAmountText;
      const cost =
        back !== undefined
          ? parseFloat(record.sellAmountHumanDecimal) - parseFloat(back)
          : NaN;
      return {
        ...base,
        title: toward,
        state: { text: t('history.state-refunded'), tone: 'warning' },
        top: Number.isFinite(cost)
          ? `−${formatAmountForDisplay(cost.toFixed(8))} ${sellSym}`
          : sold,
        topTone: 'default',
        bottom:
          back !== undefined
            ? `${t('history.refund-back')} ${formatAmountForDisplay(back)} ${sellSym}`
            : '',
      };
    }
    case SwapStatusEnum.Failed:
    case SwapStatusEnum.Expired:
      return {
        ...base,
        title: toward,
        state: {
          text: t(
            record.status === SwapStatusEnum.Expired
              ? 'history.state-expired'
              : 'history.state-failed',
          ),
          tone: 'danger',
        },
        top: sold,
        topTone: 'muted',
        bottom: '',
      };
    default:
      return {
        ...base,
        title: toward,
        state: {
          text: t(
            record.status === SwapStatusEnum.AwaitingExternalDeposit ||
              record.status === SwapStatusEnum.PendingDeposit
              ? 'history.state-awaiting-deposit'
              : 'history.state-swapping',
          ),
          tone: 'default',
        },
        top: `≈ +${got} ${getSym}`,
        topTone: 'default',
        bottom: `−${sold}`,
      };
  }
}

/** Whether a swap row's icon is the clock of a swap still moving. */
export function swapInFlight(record: SwapRecordType): boolean {
  return (
    record.status !== SwapStatusEnum.Completed &&
    record.status !== SwapStatusEnum.Refunded &&
    record.status !== SwapStatusEnum.Failed &&
    record.status !== SwapStatusEnum.Expired
  );
}

/** A swap's Zcash transaction as it reads folded under the swap. */
export function legRowText(args: {
  vt: ValueTransferType;
  time: string;
  currency: string;
  usd: string;
  t: Translate;
}): RowText {
  const { vt, time, currency, usd, t } = args;
  const received = vt.kind === ValueTransferKindEnum.Received;
  const fee =
    vt.fee && vt.fee > 0
      ? ` · ${t('history.fee')} ${zec(vt.fee)} ${currency}`
      : '';
  return {
    title: t(received ? 'history.received' : 'history.sent').trim(),
    titleMono: false,
    line: `${time}${fee}`,
    top: `${received ? '+' : '−'}${zec(vt.amount)} ${currency}`,
    topTone: received ? 'positive' : 'default',
    bottom: usd,
  };
}
