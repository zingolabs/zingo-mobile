/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Clipboard from '@react-native-clipboard/clipboard';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { useTheme } from '@react-navigation/native';

import {
  AddressBookFileClass,
  AddressClass,
  ChainNameEnum,
  SnackbarDurationEnum,
  ValueTransferType,
  ValueTransferKindEnum,
  GlobalConst,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import BoldText from '../../Components/BoldText';
import CurrencyAmount from '../../Components/CurrencyAmount';
import AddressItem from '../../Components/AddressItem';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
// this is for http. (red)
import { faTriangleExclamation, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { RPCValueTransfersStatusEnum } from '../../../app/rpc/enums/RPCValueTransfersStatusEnum';
import { useMagicModal } from 'react-native-magic-modal';
import Snackbars from '../../Components/Snackbars';
// this is for https. (primary)
//import { faLock } from '@fortawesome/free-solid-svg-icons';

type ValueTransferDetailProps = {
  index: number;
  vt: ValueTransferType;
  valueTransfersSliced: ValueTransferType[];
  totalLength: number;
  setPrivacyOption: (value: boolean) => Promise<void>;
};

const ValueTransferDetail: React.FunctionComponent<ValueTransferDetailProps> = ({
  index,
  vt,
  valueTransfersSliced,
  totalLength,
  setPrivacyOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    info,
    translate,
    language,
    privacy,
    addLastSnackbar,
    server,
    currency,
    addressBook,
    addresses,
    zenniesDonationAddress,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);

  const [valueTransfer, setValueTransfer] = useState<ValueTransferType>(vt);
  const [valueTransferIndex, setValueTransferIndex] = useState<number>(index);
  const [spendColor, setSpendColor] = useState<string>(colors.primaryDisabled);
  const [expandTxid, setExpandTxid] = useState<boolean>(false);
  const [showNavigator, setShowNavigator] = useState<boolean>(true);
  const [addressProtected, setAddressProtected] = useState<boolean>(true);
  const isTheFirstMount = useRef(true);

  const { memo, memoUA } = Utils.splitMemo(valueTransfer.memos);

  useEffect(() => {
    const spendCo =
      valueTransfer.confirmations === 0
        ? colors.primaryDisabled
        : valueTransfer.kind === ValueTransferKindEnum.Received || valueTransfer.kind === ValueTransferKindEnum.Shield
        ? colors.primary
        : colors.text;
    setSpendColor(spendCo);
  }, [colors.primary, colors.primaryDisabled, colors.text, valueTransfer.confirmations, valueTransfer.kind]);

  useEffect(() => {
    (async () => {
      setAddressProtected(await isAddressProtected(valueTransfer.address ? valueTransfer.address : ''));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueTransfer.address]);

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
    if (!add) {
      return false;
    }
    const contact: AddressBookFileClass[] = addressBook.filter(
      (ab: AddressBookFileClass) => ab.address === add || ab.uOrchardAddress === add,
    );
    return contact.length >= 1;
  };

  const thisWalletAddress: (add: string) => boolean = (add: string) => {
    const address: AddressClass[] = addresses ? addresses.filter((a: AddressClass) => a.address === add) : [];
    return address.length >= 1;
  };

  const isAddressProtected: (add: string) => Promise<boolean> = async (add: string) => {
    return zenniesDonationAddress === add;
  };

  const moveValueTransferDetail = (indexParm: number, typeParm: number) => {
    // -1 -> Previous ValueTransfer
    //  1 -> Next ValueTransfer
    if ((indexParm > 0 && typeParm === -1) || (indexParm < valueTransfersSliced.length - 1 && typeParm === 1)) {
      const newIndex = indexParm + typeParm;
      setValueTransfer(valueTransfersSliced[newIndex]);
      setValueTransferIndex(newIndex);
    }
  };

  //console.log('vt', index, totalLength, isTheFirstMount, vt);

  return (
    <View
      style={{
        marginTop: top,
        marginBottom: bottom,
        marginRight: right,
        marginLeft: left,
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        translate={translate}
      />

      <Header
        title={translate('history.details') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        setPrivacyOption={setPrivacyOption}
        addLastSnackbar={addLastSnackbar}
        closeScreen={hide}
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
            onPress={() => moveValueTransferDetail(valueTransferIndex, -1)}
            style={{ marginRight: 25 }}
            disabled={valueTransferIndex === 0}>
            <FontAwesomeIcon
              icon={faChevronUp}
              color={valueTransferIndex === 0 ? colors.primaryDisabled : colors.primary}
              size={30}
            />
          </TouchableOpacity>
          <FadeText>{(valueTransferIndex + 1).toString()}</FadeText>
          <TouchableOpacity
            onPress={() => moveValueTransferDetail(valueTransferIndex, 1)}
            style={{ marginLeft: 25 }}
            disabled={valueTransferIndex === valueTransfersSliced.length - 1}>
            <FontAwesomeIcon
              icon={faChevronDown}
              color={valueTransferIndex === valueTransfersSliced.length - 1 ? colors.primaryDisabled : colors.primary}
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
            {valueTransfer.kind === ValueTransferKindEnum.Sent && valueTransfer.confirmations === 0
              ? (translate('history.sending') as string)
              : valueTransfer.kind === ValueTransferKindEnum.Sent && valueTransfer.confirmations > 0
              ? (translate('history.sent') as string)
              : valueTransfer.kind === ValueTransferKindEnum.Received && valueTransfer.confirmations === 0
              ? (translate('history.receiving') as string)
              : valueTransfer.kind === ValueTransferKindEnum.Received && valueTransfer.confirmations > 0
              ? (translate('history.received') as string)
              : valueTransfer.kind === ValueTransferKindEnum.MemoToSelf && valueTransfer.confirmations === 0
              ? (translate('history.sendingtoself') as string)
              : valueTransfer.kind === ValueTransferKindEnum.MemoToSelf && valueTransfer.confirmations > 0
              ? (translate('history.memotoself') as string)
              : valueTransfer.kind === ValueTransferKindEnum.SendToSelf && valueTransfer.confirmations === 0
              ? (translate('history.sendingtoself') as string)
              : valueTransfer.kind === ValueTransferKindEnum.SendToSelf && valueTransfer.confirmations > 0
              ? (translate('history.sendtoself') as string)
              : valueTransfer.kind === ValueTransferKindEnum.Shield && valueTransfer.confirmations === 0
              ? (translate('history.shielding') as string)
              : valueTransfer.kind === ValueTransferKindEnum.Shield && valueTransfer.confirmations > 0
              ? (translate('history.shield') as string)
              : valueTransfer.kind === ValueTransferKindEnum.Rejection && valueTransfer.confirmations === 0
              ? (translate('history.sending') as string)
              : valueTransfer.kind === ValueTransferKindEnum.Rejection && valueTransfer.confirmations > 0
              ? (translate('history.rejection') as string)
              : ''}
          </BoldText>
          <ZecAmount
            currencyName={info.currencyName}
            size={36}
            amtZec={valueTransfer.amount}
            privacy={privacy}
            smallPrefix={true}
          />
          {!!valueTransfer.zecPrice && valueTransfer.zecPrice > 0 && (
            <CurrencyAmount price={valueTransfer.zecPrice} amtZec={valueTransfer.amount} currency={currency} privacy={privacy} />
          )}
        </View>

        {valueTransfer.confirmations === 0 && (
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {(valueTransfer.status === RPCValueTransfersStatusEnum.transmitted ||
              valueTransfer.status === RPCValueTransfersStatusEnum.calculated) && (
              <FontAwesomeIcon
                style={{ marginRight: 5 }}
                icon={faTriangleExclamation}
                color={colors.syncing}
                size={15}
              />
            )}
            <FadeText
              style={{
                color:
                  valueTransfer.status === RPCValueTransfersStatusEnum.transmitted ||
                  valueTransfer.status === RPCValueTransfersStatusEnum.calculated
                    ? colors.primary
                    : colors.primaryDisabled,
                fontSize: 12,
                opacity: 1,
                fontWeight: '700',
                textAlign:
                  valueTransfer.status === RPCValueTransfersStatusEnum.transmitted ||
                  valueTransfer.status === RPCValueTransfersStatusEnum.calculated
                    ? 'center'
                    : 'left',
                textDecorationLine:
                  valueTransfer.status === RPCValueTransfersStatusEnum.transmitted ||
                  valueTransfer.status === RPCValueTransfersStatusEnum.calculated
                    ? 'underline'
                    : 'none',
              }}>
              {(translate(`history.${valueTransfer.status}`) as string) + ' - ' + (translate('history.not-confirmed') as string)}
            </FadeText>
          </View>
        )}

        <View style={{ margin: 10 }}>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ display: 'flex' }}>
              <FadeText>{translate('history.time') as string}</FadeText>
              <RegText>{valueTransfer.time ? moment((valueTransfer.time || 0) * 1000).format('YYYY MMM D h:mm a') : '--'}</RegText>
            </View>
            <View style={{ display: 'flex', alignItems: 'flex-end' }}>
              <FadeText>{translate('history.confirmations') as string}</FadeText>
              <RegText>{valueTransfer.confirmations.toString()}</RegText>
            </View>
          </View>

          <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
            <FadeText>{translate('history.txid') as string}</FadeText>
            <TouchableOpacity
              onPress={() => {
                if (valueTransfer.txid) {
                  Clipboard.setString(valueTransfer.txid);
                  addLastSnackbar({
                    message: translate('history.txcopied') as string,
                    duration: SnackbarDurationEnum.short,
                  });
                  setExpandTxid(true);
                }
              }}>
              {!valueTransfer.txid && <RegText>{'Unknown'}</RegText>}
              {!expandTxid && !!valueTransfer.txid && <RegText>{Utils.trimToSmall(valueTransfer.txid, 10)}</RegText>}
              {expandTxid && !!valueTransfer.txid && (
                <>
                  <RegText>{valueTransfer.txid}</RegText>
                  {server.chainName !== ChainNameEnum.regtestChainName && (
                    <TouchableOpacity onPress={() => handleTxIDClick(valueTransfer.txid)}>
                      <Text style={{ color: colors.text, textDecorationLine: 'underline', margin: 15 }}>
                        {translate('history.viewexplorer') as string}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          {!!valueTransfer.fee && valueTransfer.fee > 0 && (
            <View style={{ display: 'flex', marginTop: 10 }}>
              <FadeText>{translate('history.txfee') as string}</FadeText>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <ZecAmount amtZec={valueTransfer.fee} size={18} currencyName={info.currencyName} privacy={privacy} />
              </View>
            </View>
          )}

          {!!valueTransfer.address && (
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
              <FadeText>{translate('history.address') as string}</FadeText>
              <AddressItem
                address={valueTransfer.address}
                withIcon={true}
                withSendIcon={true}
                addressProtected={addressProtected}
              />
            </View>
          )}

          {!!valueTransfer.poolType && (
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 10 }}>
              <FadeText>{translate('history.pool') as string}</FadeText>
              <RegText>{valueTransfer.poolType}</RegText>
            </View>
          )}

          <View style={{ marginTop: 10 }}>
            <FadeText>{translate('history.amount') as string}</FadeText>
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <ZecAmount amtZec={valueTransfer.amount} size={18} currencyName={info.currencyName} privacy={privacy} />
              {!!valueTransfer.zecPrice && valueTransfer.zecPrice > 0 && (
                <CurrencyAmount price={valueTransfer.zecPrice} amtZec={valueTransfer.amount} currency={currency} privacy={privacy} />
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
                  <RegText selectable={true}>{memo}</RegText>
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
                  <RegText>{GlobalConst.replyTo}</RegText>
                  {!thisWalletAddress(memoUA) && (
                    <FontAwesomeIcon icon={faTriangleExclamation} color={'red'} size={18} />
                  )}
                  <RegText style={{ opacity: thisWalletAddress(memoUA) ? 0.6 : 0.4 }}>{memoUA}</RegText>
                  {contactFound(memoUA) && (
                    <View style={{ flexDirection: 'row' }}>
                      {!thisWalletAddress(memoUA) && (
                        <RegText style={{ opacity: 0.6 }}>{translate('addressbook.likely') as string}</RegText>
                      )}
                      <AddressItem address={memoUA} onlyContact={true} />
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
    </View>
  );
};

export default ValueTransferDetail;
