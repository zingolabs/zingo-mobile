/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import Pressable, { PressTile } from '@ui/primitives/Pressable';
import { View } from 'react-native';
import {
  iconSizeSm,
  radiusMd,
  space4,
  space8,
  space12,
  space16,
  space20,
  useTheme,
} from '@app/theme';

import Clipboard from '@react-native-clipboard/clipboard';

import Text from '@ui/primitives/Text';
import PrivateAmount from '@ui/widgets/PrivateAmount';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  SnackbarDurationEnum,
  GlobalConst,
  UnifiedAddressClass,
  TransparentAddressClass,
} from '@app/AppState';

import { ContextAppLoaded } from '@app/context';
import AddressItem from '@ui/widgets/AddressItem';
import Utils from '@app/utils';
import { formatAmount } from '@app/utils/formatAmount';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import { ArrowDownIcon } from '@ui/primitives/Icons/ArrowDownIcon';
import { ArrowUpIcon } from '@ui/primitives/Icons/ArrowUpIcon';

type MessageLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
};
/** Amounts under this are dust beside the message and are left out. */
const MIN_AMOUNT_SHOWN = 0.01;

/**
 * One memo as a card under its month: who it came from or went to, when,
 * and the amount on top, then the memo. A press opens the transaction.
 */
const MessageLine: React.FunctionComponent<MessageLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetailModalShow,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, info, addressBook, addresses, addLastSnackbar } =
    context;
  const { colors } = useTheme();
  const t = (key: string) => (translate(key) as string).trim();

  const { memo, memoUA } = Utils.splitMemo(vt.memos);
  const received = vt.kind === ValueTransferKindEnum.Received;
  const sent = vt.kind === ValueTransferKindEnum.Sent;
  const failed = vt.status === RPCValueTransfersStatusEnum.failed;

  const contact = vt.address
    ? addressBook.find(ab => ab.address === vt.address)
    : undefined;
  const who = received
    ? t('history.received')
    : sent
      ? contact
        ? `${t('history.tx-to')}: ${contact.label}`
        : t('history.sent')
      : t('history.tx-self');
  const whoColor = received ? colors.fgAccent : colors.fgDefault;

  const thisWalletAddress = (add: string) =>
    (addresses ?? []).some(
      (a: UnifiedAddressClass | TransparentAddressClass) => a.address === add,
    );

  return (
    <View testID={`m-${index + 1}`} style={{ marginHorizontal: space20 }}>
      {month !== '' && (
        <View style={{ paddingTop: space16, paddingBottom: space8 }}>
          <Text
            variant="caption"
            tone="muted"
            style={{ fontWeight: '600', textTransform: 'uppercase' }}
          >
            {month}
          </Text>
        </View>
      )}
      <Pressable
        kind="tile"
        onPress={() => setValueTransferDetailModalShow(index, vt)}
      >
        <PressTile
          large
          style={{
            padding: space12,
            marginBottom: space8,
            rowGap: space8,
            borderRadius: radiusMd,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgSurface,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: space8,
            }}
          >
            {received ? (
              <ArrowDownIcon size={iconSizeSm} color={whoColor} />
            ) : (
              <ArrowUpIcon size={iconSizeSm} color={whoColor} />
            )}
            <Text
              variant="bodySmall"
              numberOfLines={1}
              color={whoColor}
              style={{ fontWeight: '600', flexShrink: 1 }}
            >
              {who}
            </Text>
            <Text variant="caption" tone="muted">
              {vt.time
                ? Utils.formatDate(vt.time * 1000, 'MMM d, h:mm aaa', language)
                : '--'}
            </Text>
            {failed && (
              <Text
                variant="caption"
                tone="danger"
                style={{ fontWeight: '600' }}
              >
                {t(`history.${vt.status}`)}
              </Text>
            )}
            <View style={{ flex: 1 }} />
            {vt.amount >= MIN_AMOUNT_SHOWN && (
              <PrivateAmount
                text={`${received ? '+' : sent ? '−' : ''}${formatAmount(vt.amount)} ${info.currencyName}`}
                variant="bodySmall"
                color={received ? colors.fgAccent : colors.fgDefault}
                style={{ fontWeight: '600' }}
              />
            )}
          </View>
          {!!memo && (
            <Pressable
              kind="link"
              onPress={() => {
                Clipboard.setString(memo);
                addLastSnackbar(
                  t('history.memocopied'),
                  SnackbarDurationEnum.short,
                );
              }}
            >
              <Text variant="body" selectable={true}>
                {memo}
              </Text>
            </Pressable>
          )}
          {!!memoUA && !thisWalletAddress(memoUA) && (
            <Pressable
              kind="link"
              onPress={() => {
                Clipboard.setString(memoUA);
                addLastSnackbar(
                  t('history.address-http'),
                  SnackbarDurationEnum.long,
                );
                addLastSnackbar(
                  t('history.addresscopied'),
                  SnackbarDurationEnum.short,
                );
              }}
              style={{ rowGap: space4 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  columnGap: space4,
                }}
              >
                <Text variant="bodySmall">{GlobalConst.replyTo}</Text>
                <TriangleAlert color={colors.fgWarning} size={iconSizeSm} />
              </View>
              <Text variant="address" tone="muted">
                {memoUA}
              </Text>
              {addressBook.some(ab => ab.address === memoUA) && (
                <View style={{ flexDirection: 'row' }}>
                  <Text variant="bodySmall" tone="muted">
                    {t('addressbook.likely')}
                  </Text>
                  <AddressItem address={memoUA} onlyContact={true} />
                </View>
              )}
            </Pressable>
          )}
        </PressTile>
      </Pressable>
    </View>
  );
};

export default React.memo(MessageLine);
