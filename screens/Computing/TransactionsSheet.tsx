/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useContext } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { GlobalConst, ValueTransferType } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { fiatQuote } from '@app/price/fiatQuote';
import Utils from '@app/utils';
import { space20, useTheme, iconSizeMd } from '@app/theme';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import TitleBar from '@ui/widgets/TitleBar';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { shortWhen, transferRowText } from '@screens/History/historyRowText';
import { transferIcon } from '@screens/History/transferIcon';
import HistoryRowBody from '@screens/History/components/HistoryRowBody';
import HistoryAvatar from '@screens/History/components/HistoryAvatar';
import { usdText } from '@screens/History/components/ValueTransferLine';

/**
 * The transactions a TEX send made, as History shows them, each opening its
 * own detail. Only the sending screen knows they belong together.
 */
const TransactionsSheet = forwardRef<
  BottomSheetModal,
  {
    rows: ValueTransferType[];
    onOpen: (vt: ValueTransferType) => void;
    onClose: () => void;
  }
>(({ rows, onOpen, onClose }, ref) => {
  const { translate, language, info, zecPrice, server, addressBook } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => (translate(key) as string).trim();
  const quote = fiatQuote(zecPrice, server, server.chainName);

  return (
    <AppSheetModal
      ref={ref}
      header={
        <TitleBar
          title={t('send.two-title')}
          right={{
            icon: XIcon,
            accessibilityLabel: t('close'),
            onPress: onClose,
          }}
        />
      }
    >
      <View testID="computing.transactions" style={{ paddingBottom: space20 }}>
        <Text
          variant="bodySmall"
          tone="muted"
          style={{ paddingHorizontal: space20, marginBottom: 8 }}
        >
          {t('send.two-body')}
        </Text>
        {rows.map((vt, index) => {
          const contact = vt.address
            ? addressBook.find(
                entry =>
                  entry.address === vt.address &&
                  entry.swapChain === GlobalConst.zecSwapChain,
              )
            : undefined;
          const price =
            vt.zecPrice && vt.zecPrice > 0
              ? vt.zecPrice
              : quote.kind === 'quote'
                ? quote.price
                : 0;
          const { icon: KindIcon } = transferIcon(vt);
          return (
            <Pressable
              key={vt.txid}
              kind="row"
              testID={`computing.transaction-${index + 1}`}
              onPress={() => onOpen(vt)}
            >
              <HistoryRowBody
                leading={
                  <HistoryAvatar
                    icon={
                      <KindIcon size={iconSizeMd} color={colors.fgDefault} />
                    }
                  />
                }
                text={transferRowText({
                  vt,
                  when: shortWhen(vt.time * 1000, Date.now(), t, ms =>
                    Utils.formatDate(ms, 'MMM d', language),
                  ),
                  currency: info.currencyName,
                  usd: usdText(vt.amount, price),
                  t,
                  contactName: contact?.label,
                })}
                hairline={index > 0}
              />
            </Pressable>
          );
        })}
      </View>
    </AppSheetModal>
  );
});

export default TransactionsSheet;
