/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTriangleExclamation, faCircleCheck as faCircleCheckSolid } from '@fortawesome/free-solid-svg-icons';
import { faCircleCheck as faCircleCheckRegular } from '@fortawesome/free-regular-svg-icons';

import Clipboard from '@react-native-clipboard/clipboard';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  AddressBookFileClass,
  AddressClass,
  SnackbarDurationEnum,
  GlobalConst,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { ContextAppLoaded } from '../../../app/context';
import AddressItem from '../../Components/AddressItem';
import RegText from '../../Components/RegText';
import Utils from '../../../app/utils';
import { RPCValueTransfersStatusEnum } from '../../../app/rpc/enums/RPCValueTransfersStatusEnum';

type MessageLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetail: (t: ValueTransferType) => void;
  setValueTransferDetailIndex: (i: number) => void;
  setValueTransferDetailModalShowing: (b: boolean) => void;
  messageAddress?: string;
};
const MessageLine: React.FunctionComponent<MessageLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetail,
  setValueTransferDetailIndex,
  setValueTransferDetailModalShowing,
  messageAddress,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, privacy, info, addressBook, addresses, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const { memo, memoUA } = Utils.splitMemo(vt.memos);

  const getAmountColor = (_vt: ValueTransferType) => {
    return vt.confirmations === 0
      ? colors.primaryDisabled
      : _vt.kind === ValueTransferKindEnum.Received || _vt.kind === ValueTransferKindEnum.Shield
      ? colors.primary
      : colors.text;
  };

  const contactFound = (add: string) => {
    if (!add) {
      return { found: false, uOrchardAddress: '' };
    }
    const contact: AddressBookFileClass[] = addressBook.filter(
      (ab: AddressBookFileClass) => ab.address === add || ab.uOrchardAddress === add,
    );
    let uOrchAdd: string = '';
    if (contact.length === 1) {
      uOrchAdd = contact[0].uOrchardAddress || '';
    } else if (contact.length === 2) {
      uOrchAdd = contact[0].uOrchardAddress || contact[1].uOrchardAddress || '';
    }
    return {
      found: contact.length >= 1,
      uOrchardAddress: uOrchAdd,
    };
  };

  const thisWalletAddress: (add: string) => boolean = (add: string) => {
    const address: AddressClass[] = addresses ? addresses.filter((a: AddressClass) => a.address === add) : [];
    return address.length >= 1;
  };

  //console.log('render ValueTransferLine - 5', index, nextLineWithSameTxid);

  return (
    <View testID={`m-${index + 1}`} style={{ display: 'flex', flexDirection: 'column', marginHorizontal: 10 }}>
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
          }}>
          <FadeText>{month}</FadeText>
        </View>
      )}
      <TouchableOpacity
        style={{ zIndex: 999 }}
        onPress={() => {
          setValueTransferDetail(vt);
          setValueTransferDetailIndex(index);
          setValueTransferDetailModalShowing(true);
        }}>
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
            borderBottomEndRadius: vt.kind === ValueTransferKindEnum.Received ? 20 : 0,
            borderBottomStartRadius: vt.kind === ValueTransferKindEnum.Received ? 0 : 20,
            backgroundColor:
              vt.kind === ValueTransferKindEnum.Received ? colors.primaryDisabled : colors.secondaryDisabled,
          }}>
          {!!vt.address && !messageAddress && (
            <View style={{ marginTop: -10, marginBottom: 10, marginLeft: 30 }}>
              <AddressItem address={vt.address} oneLine={true} closeModal={() => {}} openModal={() => {}} />
            </View>
          )}
          {(!!memo || !!memoUA) && (
            <View style={{ marginTop: 0 }}>
              {!!memo && (
                <TouchableOpacity
                  style={{ zIndex: 999 }}
                  onPress={() => {
                    Clipboard.setString(memo);
                    addLastSnackbar({
                      message: translate('history.memocopied') as string,
                      duration: SnackbarDurationEnum.short,
                    });
                  }}>
                  <RegText selectable={true}>{memo}</RegText>
                </TouchableOpacity>
              )}
              {!!memoUA && (
                <TouchableOpacity
                  style={{ zIndex: 999 }}
                  onPress={() => {
                    Clipboard.setString(memoUA);
                    if (!thisWalletAddress(memoUA)) {
                      addLastSnackbar({
                        message: translate('history.address-http') as string,
                        duration: SnackbarDurationEnum.long,
                      });
                    }
                    addLastSnackbar({
                      message: translate('history.addresscopied') as string,
                      duration: SnackbarDurationEnum.short,
                    });
                  }}>
                  {!thisWalletAddress(memoUA) &&
                    memoUA !== messageAddress &&
                    memoUA !== contactFound(memoUA).uOrchardAddress && (
                      <>
                        <RegText>{GlobalConst.replyTo}</RegText>
                        <FontAwesomeIcon icon={faTriangleExclamation} color={'red'} size={18} />
                        <RegText style={{ opacity: thisWalletAddress(memoUA) ? 0.6 : 0.4 }}>{memoUA}</RegText>
                        {contactFound(memoUA).found && (
                          <View style={{ flexDirection: 'row' }}>
                            {!thisWalletAddress(memoUA) && (
                              <RegText style={{ opacity: 0.6 }}>{translate('addressbook.likely') as string}</RegText>
                            )}
                            <AddressItem
                              address={memoUA}
                              onlyContact={true}
                              closeModal={() => {}}
                              openModal={() => {}}
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
            }}>
            {vt.amount >= Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount()) && (
              <ZecAmount
                style={{
                  paddingRight: 5,
                }}
                size={12}
                currencyName={info.currencyName}
                color={getAmountColor(vt)}
                amtZec={vt.amount}
                privacy={privacy}
              />
            )}
            <View>
              <FadeText>{vt.time ? moment((vt.time || 0) * 1000).format('MMM D, h:mm a') : '--'}</FadeText>
            </View>
            <View style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
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
                {vt.status !== RPCValueTransfersStatusEnum.confirmed && (
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
                {vt.status !== RPCValueTransfersStatusEnum.confirmed && (
                  <View style={{ marginLeft: 2, marginTop: 2 }}>
                    <ActivityIndicator
                      size={Platform.OS === GlobalConst.platformOSios ? 'small' : 12}
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
