/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext } from 'react';
import { View } from 'react-native';
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
import Utils from '@app/utils';
import SheetTitle from './SheetTitle';

type SwapHistorySheetProps = {
  records: SwapRecordType[];
};

/** What a record traded, the way the user reads it: sold → bought. */
export function swapPairLabel(record: SwapRecordType): string {
  const sell = record.sellAsset.ticker ?? record.sellAsset.symbol;
  const buy = record.receiveAsset.ticker ?? record.receiveAsset.symbol;
  const bought = record.actualReceiveAmount ?? record.expectedReceiveAmount;
  return `${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${sell} → ${formatAmountForDisplay(bought)} ${buy}`;
}

/**
 * The wallet's swaps, the ones in flight first. A row opens nothing yet: the
 * swap's detail comes with the execution screens.
 */
const SwapHistorySheet = forwardRef<BottomSheetModal, SwapHistorySheetProps>(
  ({ records }, ref) => {
    const { translate, language } = useContext(ContextAppLoaded);
    const { colors } = useTheme();
    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const sorted = [...records].sort((a, b) => {
      const aLive = isTerminalStatus(a.status) ? 1 : 0;
      const bLive = isTerminalStatus(b.status) ? 1 : 0;
      return aLive - bLive || b.createdAtMs - a.createdAtMs;
    });

    const stateOf = (
      record: SwapRecordType,
    ): { label: string; icon: React.ReactNode } => {
      switch (record.status) {
        case SwapStatusEnum.Completed:
          return {
            label: translate('swap.history-done') as string,
            icon: <CheckIcon size={20} color={colors.fgAccent} />,
          };
        case SwapStatusEnum.Refunded:
          return {
            label: translate('swap.history-refunded') as string,
            icon: <RefreshIcon size={20} color={colors.fgWarning} />,
          };
        case SwapStatusEnum.Failed:
        case SwapStatusEnum.Expired:
          return {
            label: translate('swap.history-failed') as string,
            icon: <XIcon size={20} color={colors.fgDanger} />,
          };
        default:
          return {
            label: translate('swap.history-in-progress') as string,
            icon: <RefreshIcon size={20} color={colors.fgSyncing} />,
          };
      }
    };

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
                subtitle={`${state.label} · ${Utils.formatDate(record.createdAtMs, 'MMM d, h:mm aaa', language)}`}
              />
            );
          })}
        </BottomSheetScrollView>
      </AppSheetModal>
    );
  },
);

export default SwapHistorySheet;
