/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, SafeAreaView, Linking, Text } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { useTheme } from '@react-navigation/native';

import {
  AddressBookFileClass,
  AddressClass,
  ButtonTypeEnum,
  ChainNameEnum,
  SendPageStateClass,
  SnackbarDurationEnum,
  ValueTransferType,
  ValueTransferKindEnum,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import Button from '../../Components/Button';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import BoldText from '../../Components/BoldText';
import CurrencyAmount from '../../Components/CurrencyAmount';
import AddressItem from '../../Components/AddressItem';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
// this is for http. (red)
import { faTriangleExclamation, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
// this is for https. (primary)
//import { faLock } from '@fortawesome/free-solid-svg-icons';

type ValueTransferDetailProps = {
  index: number;
  length: number;
  totalLength: number;
  vt: ValueTransferType;
  closeModal: () => void;
  openModal: () => void;
  setPrivacyOption: (value: boolean) => Promise<void>;
  setSendPageState: (s: SendPageStateClass) => void;
  moveValueTransferDetail: (index: number, type: number) => void;
};

const ValueTransferDetail: React.FunctionComponent<ValueTransferDetailProps> = ({
  index,
  length,
  totalLength,
  vt,
  closeModal,
  setPrivacyOption,
  openModal,
  setSendPageState,
  moveValueTransferDetail,
}) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, language, privacy, addLastSnackbar, server, currency, addressBook, addresses } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [spendColor, setSpendColor] = useState<string>(colors.primaryDisabled);
  const [expandTxid, setExpandTxid] = useState<boolean>(false);
  const [showNavigator, setShowNavigator] = useState<boolean>(true);
  const [addressProtected, setAddressProtected] = useState<boolean>(true);
  const isTheFirstMount = useRef(true);

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

  useEffect(() => {
    const spendCo =
      vt.confirmations === 0
        ? colors.primaryDisabled
        : vt.kind === ValueTransferKindEnum.Received || vt.kind === ValueTransferKindEnum.Shield
        ? colors.primary
        : colors.text;
    setSpendColor(spendCo);
  }, [colors.primary, colors.primaryDisabled, colors.text, vt.confirmations, vt.kind]);

  useEffect(() => {
    (async () => {
      setAddressProtected(await isAddressProtected(vt.address ? vt.address : ''));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vt.address]);

  const handleTxIDClick = (txid?: string) => {
    if (!txid) {
      return;
    }

    const url = Utils.getBlockExplorerTxIDURL(txid, server.chainName);
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  };

  // if the App is syncing, the VT list will change (new items).
  // Hide the navigator is the solution because the current index
  // will be associated to other item.
  useEffect(() => {
    if (isTheFirstMount.current) {
      isTheFirstMount.current = false;
      return;
    }
    if (showNavigator) {
      setShowNavigator(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalLength]);

  const contactFound: (add: string) => boolean = (add: string) => {
    const contact: AddressBookFileClass[] = addressBook.filter((ab: AddressBookFileClass) => ab.address === add);
    return contact.length >= 1;
  };

  const thisWalletAddress: (add: string) => boolean = (add: string) => {
    const address: AddressClass[] = addresses ? addresses.filter((a: AddressClass) => a.address === add) : [];
    return address.length >= 1;
  };

  const isAddressProtected: (add: string) => Promise<boolean> = async (add: string) => {
    const zennyTips = await Utils.getZenniesDonationAddress(server.chainName);
    return zennyTips === add;
  };

  //console.log('vt', index, totalLength, isTheFirstMount);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header
        title={translate('history.details') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        setPrivacyOption={setPrivacyOption}
        addLastSnackbar={addLastSnackbar}
      />
      {showNavigator && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginRight: 30,
            marginTop: 5,
          }}>
          <TouchableOpacity
            onPress={() => moveValueTransferDetail(index, -1)}
            style={{ marginRight: 25 }}
            disabled={index === 0}>
            <FontAwesomeIcon
              icon={faChevronUp}
              color={index === 0 ? colors.primaryDisabled : colors.primary}
              size={30}
            />
          </TouchableOpacity>
          <FadeText>{(index + 1).toString()}</FadeText>
          <TouchableOpacity
            onPress={() => moveValueTransferDetail(index, 1)}
            style={{ marginLeft: 25 }}
            disabled={index === length - 1}>
            <FontAwesomeIcon
              icon={faChevronDown}
              color={index === length - 1 ? colors.primaryDisabled : colors.primary}
              size={30}
            />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        indicatorStyle={'white'}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: 25,
            marginTop: showNavigator ? 5 : 25,
            padding: 10,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.border,
          }}>
          <BoldText style={{ textAlign: 'center', textTransform: 'capitalize', color: spendColor }}>
            {vt.kind === ValueTransferKindEnum.Sent && vt.confirmations === 0
              ? (translate('history.sending') as string)
              : vt.kind === ValueTransferKindEnum.Sent && vt.confirmations > 0
              ? (translate('history.sent') as string)
              : vt.kind === ValueTransferKindEnum.Received && vt.confirmations === 0
              ? (translate('history.receiving') as string)
              : vt.kind === ValueTransferKindEnum.Received && vt.confirmations > 0
              ? (translate('history.received') as string)
              : vt.kind === ValueTransferKindEnum.MemoToSelf && vt.confirmations === 0
              ? (translate('history.sendingtoself') as string)
              : vt.kind === ValueTransferKindEnum.MemoToSelf && vt.confirmations > 0
              ? (translate('history.memotoself') as string)
              : vt.kind === ValueTransferKindEnum.SendToSelf && vt.confirmations === 0
              ? (translate('history.sendingtoself') as string)
              : vt.kind === ValueTransferKindEnum.SendToSelf && vt.confirmations > 0
              ? (translate('history.sendtoself') as string)
              : vt.kind === ValueTransferKindEnum.Shield && vt.confirmations === 0
              ? (translate('history.shielding') as string)
              : vt.kind === ValueTransferKindEnum.Shield && vt.confirmations > 0
              ? (translate('history.shield') as string)
              : ''}
          </BoldText>
          <ZecAmount
            currencyName={info.currencyName}
            size={36}
            amtZec={vt.amount}
            privacy={privacy}
            smallPrefix={true}
          />
          {!!vt.zecPrice && vt.zecPrice > 0 && (
            <CurrencyAmount price={vt.zecPrice} amtZec={vt.amount} currency={currency} privacy={privacy} />
          )}
        </View>

        <View style={{ margin: 10 }}>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ display: 'flex' }}>
              <FadeText>{translate('history.time') as string}</FadeText>
              <RegText>{vt.time ? moment((vt.time || 0) * 1000).format('YYYY MMM D h:mm a') : '--'}</RegText>
            </View>
            <View style={{ display: 'flex', alignItems: 'flex-end' }}>
              <FadeText>{translate('history.confirmations') as string}</FadeText>
              <RegText>{vt.confirmations.toString()}</RegText>
            </View>
          </View>

          <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
            <FadeText>{translate('history.txid') as string}</FadeText>
            <TouchableOpacity
              onPress={() => {
                if (vt.txid) {
                  Clipboard.setString(vt.txid);
                  addLastSnackbar({
                    message: translate('history.txcopied') as string,
                    duration: SnackbarDurationEnum.short,
                  });
                  setExpandTxid(true);
                }
              }}>
              {!vt.txid && <RegText>{'Unknown'}</RegText>}
              {!expandTxid && !!vt.txid && <RegText>{Utils.trimToSmall(vt.txid, 10)}</RegText>}
              {expandTxid && !!vt.txid && (
                <>
                  <RegText>{vt.txid}</RegText>
                  {server.chainName !== ChainNameEnum.regtestChainName && (
                    <TouchableOpacity onPress={() => handleTxIDClick(vt.txid)}>
                      <Text style={{ color: colors.text, textDecorationLine: 'underline', margin: 15 }}>
                        {translate('history.viewexplorer') as string}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          {!!vt.fee && vt.fee > 0 && (
            <View style={{ display: 'flex', marginTop: 10 }}>
              <FadeText>{translate('history.txfee') as string}</FadeText>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <ZecAmount amtZec={vt.fee} size={18} currencyName={info.currencyName} privacy={privacy} />
              </View>
            </View>
          )}

          {!!vt.address && (
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
              <FadeText>{translate('history.address') as string}</FadeText>
              <AddressItem
                address={vt.address}
                withIcon={true}
                withSendIcon={true}
                setSendPageState={setSendPageState}
                closeModal={closeModal}
                openModal={openModal}
                addressProtected={addressProtected}
              />
            </View>
          )}

          {!!vt.poolType && (
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
              <FadeText>{translate('history.pool') as string}</FadeText>
              <RegText>{vt.poolType}</RegText>
            </View>
          )}

          <View style={{ marginTop: 10 }}>
            <FadeText>{translate('history.amount') as string}</FadeText>
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <ZecAmount amtZec={vt.amount} size={18} currencyName={info.currencyName} privacy={privacy} />
              {!!vt.zecPrice && vt.zecPrice > 0 && (
                <CurrencyAmount price={vt.zecPrice} amtZec={vt.amount} currency={currency} privacy={privacy} />
              )}
            </View>
          </View>

          {(!!memo || !!memoUA) && (
            <View style={{ marginTop: 10 }}>
              <FadeText>{translate('history.memo') as string}</FadeText>
              {!!memo && (
                <TouchableOpacity
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
                      <RegText color={colors.primaryDisabled}>
                        {translate('addressbook.thiswalletaddress') as string}
                      </RegText>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 10 }}>
        <Button type={ButtonTypeEnum.Secondary} title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default ValueTransferDetail;
