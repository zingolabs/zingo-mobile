/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  iconSizeSm,
  radiusMd,
  space4,
  space8,
  space12,
  space16,
  space24,
  useTheme,
} from '@app/theme';

import Clipboard from '@react-native-clipboard/clipboard';

import ZecAmount from '@ui/widgets/ZecAmount';
import Text from '@ui/primitives/Text';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  AddressBookFileClass,
  SnackbarDurationEnum,
  GlobalConst,
  UnifiedAddressClass,
  TransparentAddressClass,
} from '@app/AppState';

import { ContextAppLoaded } from '@app/context';
import AddressItem from '@ui/widgets/AddressItem';
import Utils from '@app/utils';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import { VerifyXIcon } from '@ui/primitives/Icons/VerifyXIcon';
import { CheckCircleLineIcon } from '@ui/primitives/Icons/CheckCircleLineIcon';
import { CheckCircleIcon } from '@ui/primitives/Icons/CheckCircleIcon';

type MessageLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
  messageAddress?: string;
};
// Amounts under this are not worth a line of their own — the message is the
// point, not the dust attached to it.
const MIN_AMOUNT_SHOWN = 0.01;
/** How far a bubble stays from the far side, so sent and received read apart. */
const BUBBLE_INSET = space24 * 2;
/** The corner a bubble points from, toward its sender. */
const TAIL_CORNER = 0;

const MessageLine: React.FunctionComponent<MessageLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetailModalShow,
  messageAddress,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    privacy,
    info,
    addressBook,
    addresses,
    addLastSnackbar,
  } = context;
  const { colors } = useTheme();

  const { memo, memoUA } = Utils.splitMemo(vt.memos);

  const getAmountColor = (_vt: ValueTransferType) => {
    return _vt.kind === ValueTransferKindEnum.Received ||
      _vt.kind === ValueTransferKindEnum.Shield
      ? colors.fgAccent
      : colors.fgDefault;
  };

  const contactFound = (add: string) => {
    if (!add) {
      return {
        found: false,
      };
    }
    const contact: AddressBookFileClass[] = addressBook.filter(
      (ab: AddressBookFileClass) => ab.address === add,
    );
    return {
      found: contact.length >= 1,
    };
  };

  const thisWalletAddress: (add: string) => boolean = (add: string) => {
    const address: (UnifiedAddressClass | TransparentAddressClass)[] = addresses
      ? addresses.filter(
          (a: UnifiedAddressClass | TransparentAddressClass) =>
            a.address === add,
        )
      : [];
    return address.length >= 1;
  };

  //console.log('render ValueTransferLine - 5', index, nextLineWithSameTxid);

  //if (index === 0) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.failed;
  //  vt.kind = ValueTransferKindEnum.Shield;
  //}
  //if (index === 1) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.failed;
  //  vt.kind = ValueTransferKindEnum.Sent;
  //}

  return (
    <View
      testID={`m-${index + 1}`}
      style={{ display: 'flex', flexDirection: 'column', marginHorizontal: 20 }}
    >
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
      <TouchableOpacity
        style={{ zIndex: 999 }}
        onPress={() => {
          setValueTransferDetailModalShow(index, vt);
        }}
      >
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: space12,
            marginBottom: space8,
            marginLeft:
              vt.kind === ValueTransferKindEnum.Received ? 0 : BUBBLE_INSET,
            marginRight:
              vt.kind === ValueTransferKindEnum.Received ? BUBBLE_INSET : 0,
            borderRadius: radiusMd,
            borderBottomEndRadius:
              vt.kind === ValueTransferKindEnum.Received
                ? radiusMd
                : TAIL_CORNER,
            borderBottomStartRadius:
              vt.kind === ValueTransferKindEnum.Received
                ? TAIL_CORNER
                : radiusMd,
            backgroundColor:
              vt.status === RPCValueTransfersStatusEnum.failed
                ? colors.bgMutedSubtle
                : colors.bgAccentSubtle,
          }}
        >
          {!!vt.address && !messageAddress && (
            <View style={{ marginBottom: space8 }}>
              <AddressItem address={vt.address} oneLine={true} />
            </View>
          )}
          {(!!memo || !!memoUA) && (
            <View style={{ marginTop: 0 }}>
              {!!memo && (
                <TouchableOpacity
                  style={{ zIndex: 999 }}
                  onPress={() => {
                    Clipboard.setString(memo);
                    addLastSnackbar(
                      translate('history.memocopied') as string,
                      SnackbarDurationEnum.short,
                    );
                  }}
                >
                  <Text variant="body" selectable={true}>
                    {memo}
                  </Text>
                </TouchableOpacity>
              )}
              {!!memoUA && (
                <TouchableOpacity
                  style={{ zIndex: 999 }}
                  onPress={() => {
                    Clipboard.setString(memoUA);
                    if (!thisWalletAddress(memoUA)) {
                      addLastSnackbar(
                        translate('history.address-http') as string,
                        SnackbarDurationEnum.long,
                      );
                    }
                    addLastSnackbar(
                      translate('history.addresscopied') as string,
                      SnackbarDurationEnum.short,
                    );
                  }}
                >
                  {!thisWalletAddress(memoUA) && memoUA !== messageAddress && (
                    <>
                      <Text variant="body">{GlobalConst.replyTo}</Text>
                      <TriangleAlert
                        color={colors.fgWarning}
                        size={iconSizeSm}
                      />
                      <Text variant="address" tone="muted">
                        {memoUA}
                      </Text>
                      {contactFound(memoUA).found && (
                        <View style={{ flexDirection: 'row' }}>
                          {!thisWalletAddress(memoUA) && (
                            <Text variant="bodySmall" tone="muted">
                              {translate('addressbook.likely') as string}
                            </Text>
                          )}
                          <AddressItem address={memoUA} onlyContact={true} />
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-end',
            }}
          >
            {vt.status === RPCValueTransfersStatusEnum.failed && (
              <Text
                variant="caption"
                tone="danger"
                style={{ fontWeight: '600', marginRight: space8 }}
              >
                {translate(`history.${vt.status}`) as string}
              </Text>
            )}
            {vt.amount >= MIN_AMOUNT_SHOWN && (
              <ZecAmount
                style={{ paddingRight: space4 }}
                size={12}
                currencyName={info.currencyName}
                color={getAmountColor(vt)}
                amtZec={vt.amount}
                privacy={privacy}
              />
            )}
            <View>
              <Text variant="caption" tone="muted">
                {vt.time
                  ? Utils.formatDate(
                      (vt.time || 0) * 1000,
                      'MMM d, h:mm aaa',
                      language,
                    )
                  : '--'}
              </Text>
            </View>
            <View
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {vt.status === RPCValueTransfersStatusEnum.failed && (
                  <VerifyXIcon
                    style={{ marginLeft: 5, marginRight: 1, marginTop: 2 }}
                    size={iconSizeSm}
                    color={colors.fgDanger}
                  />
                )}
                {(vt.status === RPCValueTransfersStatusEnum.calculated ||
                  vt.status === RPCValueTransfersStatusEnum.transmitted ||
                  vt.status === RPCValueTransfersStatusEnum.mempool) && (
                  <CheckCircleLineIcon
                    style={{ marginLeft: 5, marginRight: 1, marginTop: 2 }}
                    size={iconSizeSm}
                    color={colors.fgWarning}
                  />
                )}
                {vt.status === RPCValueTransfersStatusEnum.confirmed && (
                  <CheckCircleIcon
                    style={{ marginLeft: 5, marginRight: 1, marginTop: 2 }}
                    size={iconSizeSm}
                    color={colors.fgAccent}
                    checkColor={colors.fgOnAccent}
                  />
                )}
                {vt.status !== RPCValueTransfersStatusEnum.confirmed &&
                  vt.status !== RPCValueTransfersStatusEnum.failed && (
                    <CheckCircleLineIcon
                      style={{ marginLeft: 1, marginRight: 0, marginTop: 2 }}
                      size={iconSizeSm}
                      color={colors.fgWarning}
                    />
                  )}
                {vt.status === RPCValueTransfersStatusEnum.confirmed && (
                  <CheckCircleIcon
                    style={{ marginLeft: 1, marginRight: 0, marginTop: 2 }}
                    size={iconSizeSm}
                    color={colors.fgAccent}
                    checkColor={colors.fgOnAccent}
                  />
                )}
                {vt.status !== RPCValueTransfersStatusEnum.confirmed &&
                  vt.status !== RPCValueTransfersStatusEnum.failed && (
                    <View style={{ marginLeft: 2, marginTop: 2 }}>
                      <ActivityIndicator
                        size={
                          Platform.OS === GlobalConst.platformOSios
                            ? 'small'
                            : 12
                        }
                        color={colors.fgMuted}
                      />
                    </View>
                  )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(MessageLine);
