/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import Clipboard from '@react-native-community/clipboard';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  AddressBookFileClass,
  AddressClass,
  SnackbarDurationEnum,
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

type MessageLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetail: (t: ValueTransferType) => void;
  setValueTransferDetailIndex: (i: number) => void;
  setValueTransferDetailModalShowing: (b: boolean) => void;
  fromMessageAddress: boolean;
};
const MessageLine: React.FunctionComponent<MessageLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetail,
  setValueTransferDetailIndex,
  setValueTransferDetailModalShowing,
  fromMessageAddress,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, privacy, info, addressBook, addresses, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const memoTotal = vt.memos && vt.memos.length > 0 ? vt.memos.join('\n') : '';
  let memo = '';
  let memoUA = '';
  if (memoTotal.includes('\nReply to: \n')) {
    let memoArray = memoTotal.split('\nReply to: \n');
    const memoPoped = memoArray.pop();
    memoUA = memoPoped ? memoPoped : '';
    memo = memoArray.join('');
  } else {
    memo = memoTotal;
  }

  const getAmountColor = (_vt: ValueTransferType) => {
    return vt.confirmations === 0
      ? colors.primaryDisabled
      : _vt.kind === ValueTransferKindEnum.Received || _vt.kind === ValueTransferKindEnum.Shield
      ? colors.primary
      : colors.text;
  };

  const contactFound: (add: string) => boolean = (add: string) => {
    const contact: AddressBookFileClass[] = addressBook.filter((ab: AddressBookFileClass) => ab.address === add);
    return contact.length >= 1;
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
            padding: 20,
            marginLeft: vt.kind === ValueTransferKindEnum.Received ? 0 : 50,
            marginRight: vt.kind === ValueTransferKindEnum.Received ? 50 : 0,
            borderRadius: 20,
            borderBottomEndRadius: vt.kind === ValueTransferKindEnum.Received ? 20 : 0,
            borderBottomStartRadius: vt.kind === ValueTransferKindEnum.Received ? 0 : 20,
            backgroundColor:
              vt.kind === ValueTransferKindEnum.Received ? colors.primaryDisabled : colors.secondaryDisabled,
          }}>
          {!!vt.address && !fromMessageAddress && (
            <View style={{ marginTop: -15, marginBottom: 10, marginLeft: 30 }}>
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
                  <RegText>{memo}</RegText>
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
                  <RegText>{'\nReply to:'}</RegText>
                  {!thisWalletAddress(memoUA) && (
                    <FontAwesomeIcon icon={faTriangleExclamation} color={'red'} size={18} />
                  )}
                  <RegText style={{ opacity: thisWalletAddress(memoUA) ? 0.6 : 0.4 }}>{memoUA}</RegText>
                  {contactFound(memoUA) && (
                    <View style={{ flexDirection: 'row' }}>
                      {!thisWalletAddress(memoUA) && (
                        <RegText style={{ opacity: 0.6 }}>{translate('addressbook.likely') as string}</RegText>
                      )}
                      <AddressItem address={memoUA} onlyContact={true} closeModal={() => {}} openModal={() => {}} />
                    </View>
                  )}
                  {!contactFound(memoUA) && thisWalletAddress(memoUA) && (
                    <View style={{ flexDirection: 'row' }}>
                      <RegText>{translate('addressbook.thiswalletaddress') as string}</RegText>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: vt.kind === ValueTransferKindEnum.Received ? 'row' : 'row-reverse',
            alignItems: 'center',
            marginBottom: 5,
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
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(MessageLine);
