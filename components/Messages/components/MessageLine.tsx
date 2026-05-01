/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faTriangleExclamation,
  faCircleCheck as faCircleCheckSolid,
  faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faCircleCheck as faCircleCheckRegular } from '@fortawesome/free-regular-svg-icons';

import Clipboard from '@react-native-clipboard/clipboard';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  AddressBookFileClass,
  SnackbarDurationEnum,
  GlobalConst,
  UnifiedAddressClass,
  TransparentAddressClass,
  ScreenEnum,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';

import { ContextAppLoaded } from '../../../app/context';
import AddressItem from '../../Components/AddressItem';
import RegText from '../../Components/RegText';
import Utils from '../../../app/utils';
import { RPCValueTransfersStatusEnum } from '../../../app/rpc/enums/RPCValueTransfersStatusEnum';

type MessageLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
  messageAddress?: string;
  screenName: ScreenEnum;
};
const MessageLine: React.FunctionComponent<MessageLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetailModalShow,
  messageAddress,
  screenName,
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
  const { colors } = useTheme() as ThemeType;

  const { memo, memoUA } = Utils.splitMemo(vt.memos);

  const getAmountColor = (_vt: ValueTransferType) => {
    return _vt.kind === ValueTransferKindEnum.Received ||
      _vt.kind === ValueTransferKindEnum.Shield
      ? colors.primary
      : colors.text;
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
      style={{ display: 'flex', flexDirection: 'column', marginHorizontal: 10 }}
    >
      {month !== '' && (
        <View
          style={{
            paddingLeft: 15,
            paddingTop: 5,
            paddingBottom: 5,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.card,
            backgroundColor: colors.background,
          }}
        >
          <FadeText>{month}</FadeText>
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
            padding: 10,
            marginBottom: 5,
            marginLeft: vt.kind === ValueTransferKindEnum.Received ? 0 : 50,
            marginRight: vt.kind === ValueTransferKindEnum.Received ? 50 : 0,
            borderRadius: 20,
            borderBottomEndRadius:
              vt.kind === ValueTransferKindEnum.Received ? 20 : 0,
            borderBottomStartRadius:
              vt.kind === ValueTransferKindEnum.Received ? 0 : 20,
            backgroundColor:
              vt.kind === ValueTransferKindEnum.Received
                ? colors.primaryDisabled
                : colors.secondaryDisabled,
            opacity: vt.status === RPCValueTransfersStatusEnum.failed ? 0.5 : 1,
          }}
        >
          {!!vt.address && !messageAddress && (
            <View style={{ marginTop: -10, marginBottom: 10, marginLeft: 30 }}>
              <AddressItem
                address={vt.address}
                screenName={screenName}
                oneLine={true}
              />
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
                  <RegText selectable={true}>{memo}</RegText>
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
                      <RegText>{GlobalConst.replyTo}</RegText>
                      <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        color={'red'}
                        size={18}
                      />
                      <RegText
                        style={{
                          opacity: thisWalletAddress(memoUA) ? 0.6 : 0.4,
                        }}
                      >
                        {memoUA}
                      </RegText>
                      {contactFound(memoUA).found && (
                        <View style={{ flexDirection: 'row' }}>
                          {!thisWalletAddress(memoUA) && (
                            <RegText style={{ opacity: 0.6 }}>
                              {translate('addressbook.likely') as string}
                            </RegText>
                          )}
                          <AddressItem
                            address={memoUA}
                            screenName={screenName}
                            onlyContact={true}
                          />
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
              <FadeText
                style={{
                  color: colors.danger.primary,
                  alignSelf: 'center',
                  fontSize: 12,
                  opacity: 1,
                  fontWeight: '700',
                  marginRight: 10,
                  marginTop: 2,
                }}
              >
                {translate(`history.${vt.status}`) as string}
              </FadeText>
            )}
            {vt.amount >=
              Utils.parseStringLocaleToNumberFloat(
                Utils.getZenniesDonationAmount(),
              ) && (
              <ZecAmount
                style={{
                  paddingRight: 5,
                  opacity:
                    vt.status === RPCValueTransfersStatusEnum.failed ? 0.5 : 1,
                }}
                size={12}
                currencyName={info.currencyName}
                color={getAmountColor(vt)}
                amtZec={vt.amount}
                privacy={privacy}
              />
            )}
            <View>
              <FadeText>
                {vt.time
                  ? Utils.formatDate(
                      (vt.time || 0) * 1000,
                      'MMM d, h:mm aaa',
                      language,
                    )
                  : '--'}
              </FadeText>
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
                  <FontAwesomeIcon
                    style={{ marginLeft: 5, marginRight: 1, marginTop: 2 }}
                    size={12}
                    icon={faCircleXmark}
                    color={colors.danger.primary}
                  />
                )}
                {(vt.status === RPCValueTransfersStatusEnum.calculated ||
                  vt.status === RPCValueTransfersStatusEnum.transmitted) && (
                  <FontAwesomeIcon
                    style={{ marginLeft: 5, marginRight: 1, marginTop: 2 }}
                    size={12}
                    icon={faCircleCheckRegular}
                    color={colors.primary}
                  />
                )}
                {(vt.status === RPCValueTransfersStatusEnum.mempool ||
                  vt.status === RPCValueTransfersStatusEnum.confirmed) && (
                  <FontAwesomeIcon
                    style={{ marginLeft: 5, marginRight: 1, marginTop: 2 }}
                    size={12}
                    icon={faCircleCheckSolid}
                    color={colors.primary}
                  />
                )}
                {vt.status !== RPCValueTransfersStatusEnum.confirmed &&
                  vt.status !== RPCValueTransfersStatusEnum.failed && (
                    <FontAwesomeIcon
                      style={{ marginLeft: 1, marginRight: 0, marginTop: 2 }}
                      size={12}
                      icon={faCircleCheckRegular}
                      color={colors.primary}
                    />
                  )}
                {vt.status === RPCValueTransfersStatusEnum.confirmed && (
                  <FontAwesomeIcon
                    style={{ marginLeft: 1, marginRight: 0, marginTop: 2 }}
                    size={12}
                    icon={faCircleCheckSolid}
                    color={colors.primary}
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
                        color={colors.primary}
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
