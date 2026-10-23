/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { space16, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  SwapStatusEnum,
  formatAmountForDisplay,
  isTerminalStatus,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import ListRow from '@ui/primitives/ListRow';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { RefreshIcon } from '@ui/primitives/Icons/RefreshIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import SheetTitle from './SheetTitle';

type SwapHistorySheetProps = {
  records: SwapRecordType[];
  /** Opens a swap where it stands: its deposit, its tracking or its detail. */
  onOpen: (record: SwapRecordType) => void;
};

/**
 * What a record traded, the way the user reads it: sold → bought. A swap
 * that delivered nothing names only the coin it was for.
 */
export function swapPairLabel(record: SwapRecordType): string {
  const sell = record.sellAsset.ticker ?? record.sellAsset.symbol;
  const buy = record.receiveAsset.ticker ?? record.receiveAsset.symbol;
  const bought = record.actualReceiveAmount ?? record.expectedReceiveAmount;
  const delivered =
    record.status === SwapStatusEnum.Refunded ||
    record.status === SwapStatusEnum.Failed ||
    record.status === SwapStatusEnum.Expired
      ? buy
      : `${formatAmountForDisplay(bought)} ${buy}`;
  return `${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${sell} → ${delivered}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "today", "yesterday", "3 days ago". */
function daysAgo(
  createdAtMs: number,
  nowMs: number,
  t: (key: string) => string,
): string {
  const days = Math.round((nowMs - createdAtMs) / DAY_MS);
  if (days < 1) {
    return t('swap.history-today');
  }
  if (days === 1) {
    return t('swap.history-yesterday');
  }
  return t('swap.history-days-ago').replace('{n}', String(days));
}

/** The wallet's swaps, the ones in flight first. */
const SwapHistorySheet = forwardRef<BottomSheetModal, SwapHistorySheetProps>(
  ({ records, onOpen }, ref) => {
    const { translate } = useContext(ContextAppLoaded);
    const t = (key: string) => translate(key) as string;
    const { colors } = useTheme();
    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const sorted = [...records].sort((a, b) => {
      const aLive = isTerminalStatus(a.status) ? 1 : 0;
      const bLive = isTerminalStatus(b.status) ? 1 : 0;
      return aLive - bLive || b.createdAtMs - a.createdAtMs;
    });

    const tile = (icon: React.ReactNode, background: string) => (
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
    );

    const stateOf = (
      record: SwapRecordType,
    ): { label: string; icon: React.ReactNode; live: boolean } => {
      switch (record.status) {
        case SwapStatusEnum.Completed:
          return {
            label: t('swap.history-done'),
            icon: tile(
              <CheckIcon size={20} color={colors.fgAccent} />,
              colors.bgAccentSubtle,
            ),
            live: false,
          };
        case SwapStatusEnum.Refunded:
          return {
            label: t('swap.history-refunded'),
            icon: tile(
              <RefreshIcon size={20} color={colors.fgWarning} />,
              colors.bgWarningSubtle,
            ),
            live: false,
          };
        case SwapStatusEnum.Failed:
        case SwapStatusEnum.Expired:
          return {
            label: t('swap.history-failed'),
            icon: tile(
              <XIcon size={20} color={colors.fgDanger} />,
              colors.bgDangerSubtle,
            ),
            live: false,
          };
        default:
          return {
            label: t(
              record.status === SwapStatusEnum.AwaitingExternalDeposit
                ? 'swap.pending-waiting'
                : 'swap.pending-swapping',
            ),
            icon: tile(
              <ActivityIndicator size="small" color={colors.fgPriceUp} />,
              colors.bgAccentSubtle,
            ),
            live: true,
          };
      }
    };
    const nowMs = Date.now();

    return (
      <AppSheetModal
        ref={ref}
        header={
          <SheetTitle
            title={translate('swap.history-title') as string}
            onClose={dismiss}
            closeLabel={translate('swap.close') as string}
          />
        }
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: space16,
            paddingBottom: 30,
          }}
        >
          {sorted.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text variant="body" tone="muted">
                {translate('swap.history-empty') as string}
              </Text>
            </View>
          )}
          {sorted.map(record => {
            const state = stateOf(record);
            return (
              <ListRow
                key={record.recordId}
                testID={`swap.history.${record.recordId}`}
                leading={state.icon}
                title={swapPairLabel(record)}
                subtitle={
                  state.live
                    ? state.label
                    : `${state.label} · ${daysAgo(record.createdAtMs, nowMs, t)}`
                }
                chevron
                onPress={() => onOpen(record)}
              />
            );
          })}
        </BottomSheetScrollView>
      </AppSheetModal>
    );
  },
);

export default SwapHistorySheet;
