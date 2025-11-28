/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import moment from 'moment';

import { useNavigation, useTheme } from '@react-navigation/native';

import {
  SnackbarDurationEnum,
  ValueTransferType,
  ValueTransferKindEnum,
  GlobalConst,
  RouteEnum,
  UnifiedAddressClass,
  TransparentAddressClass,
  ScreenEnum,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import { AppDrawerParamList, ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import BoldText from '../../Components/BoldText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
// this is for http. (red)
import { faTriangleExclamation, faChevronDown, faChevronUp, faChevronLeft, faRefresh, faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { RPCValueTransfersStatusEnum } from '../../../app/rpc/enums/RPCValueTransfersStatusEnum';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ValueTransferDetailProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.ValueTransferDetail>;

const ValueTransferDetail: React.FunctionComponent<ValueTransferDetailProps> = ({
  route,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    info,
    translate,
    language,
    privacy,
    addLastSnackbar,
    addresses,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.ValueTransferDetail;

  const insets = useSafeAreaInsets();

  const [valueTransfer, setValueTransfer] = useState<ValueTransferType>(!!route.params && route.params.vt !== undefined ? route.params.vt : {} as ValueTransferType);
  const [valueTransferIndex, setValueTransferIndex] = useState<number>(!!route.params && route.params.index !== undefined ? route.params.index : 0);
  const [valueTransfersSliced, setValueTransfersSliced] = useState<ValueTransferType[]>(!!route.params && route.params.valueTransfersSliced !== undefined ? route.params.valueTransfersSliced : [] as ValueTransferType[]);
  const [totalLength, setTotalLength] = useState<number>(!!route.params && route.params.totalLength !== undefined ? route.params.totalLength : 0);
  const [spendColor, setSpendColor] = useState<string>(colors.primaryDisabled);
  const [showNavigator, setShowNavigator] = useState<boolean>(true); // by default
  const isTheFirstMount = useRef(true);

  const { memo, memoUA } = Utils.splitMemo(valueTransfer.memos);

  const amountColor =
    valueTransfer.confirmations >= 0 &&
    valueTransfer.confirmations < GlobalConst.minConfirmations
      ? colors.primaryDisabled
      : colors.text;

  const icon =
    valueTransfer.confirmations >= 0 &&
    valueTransfer.confirmations < GlobalConst.minConfirmations
      ? faRefresh
      : valueTransfer.kind === ValueTransferKindEnum.Received || valueTransfer.kind === ValueTransferKindEnum.Shield
      ? faArrowDown
      : faArrowUp;

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

  useEffect(() => {
    const _index = !!route.params && route.params.index !== undefined ? route.params.index : 0;
    const _vt = !!route.params && route.params.vt !== undefined ? route.params.vt : {} as ValueTransferType;
    const _valueTransfersSliced = !!route.params && route.params.valueTransfersSliced !== undefined ? route.params.valueTransfersSliced : [] as ValueTransferType[];
    const _totalLength = !!route.params && route.params.totalLength !== undefined ? route.params.totalLength : 0;
    setValueTransferIndex(_index);
    setValueTransfer(_vt);
    setValueTransfersSliced(_valueTransfersSliced);
    setTotalLength(_totalLength);
  }, [
    route, 
    route.params, 
    route.params?.index,
    route.params?.vt,
    route.params?.valueTransfersSliced,
    route.params?.totalLength,
  ]);
  
  useEffect(() => {
    const spendCo =
      valueTransfer.confirmations >= 0 &&
      valueTransfer.confirmations < GlobalConst.minConfirmations
        ? colors.primaryDisabled
        : colors.text;
    setSpendColor(spendCo);
  }, [colors.primary, colors.primaryDisabled, colors.text, valueTransfer.confirmations, valueTransfer.kind]);

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

  const thisWalletAddress: (add: string) => boolean = (add: string) => {
    const address: (UnifiedAddressClass | TransparentAddressClass)[] = addresses ? addresses.filter((a: UnifiedAddressClass | TransparentAddressClass) => a.address === add) : [];
    return address.length >= 1;
  };

  const moveValueTransferDetail = (indexParm: number, typeParm: number) => {
    // -1 -> Previous ValueTransfer
    //  1 -> Next ValueTransfer
    if ((indexParm > 0 && typeParm === -1) ||
        (indexParm < valueTransfersSliced.length - 1 && typeParm === 1)) {
      const newIndex = indexParm + typeParm;
      setValueTransfer(valueTransfersSliced[newIndex]);
      setValueTransferIndex(newIndex);
    }
  };

  //console.log('render History Detail', valueTransferIndex, valueTransfer);

  //if (valueTransfer.status === RPCValueTransfersStatusEnum.calculated || valueTransfer.status === RPCValueTransfersStatusEnum.transmitted) {
  //  console.log('server', info.latestBlock, 'VT', valueTransfer.blockheight, 'expire', GlobalConst.expireBlocks);
  //  console.log(info.latestBlock - valueTransfer.blockheight < GlobalConst.expireBlocks);
  //} 

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{ 
          flex: 1, 
          backgroundColor: colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >

        <View style={{
          position: 'absolute',
          width: 75,
          top: 10,
          left: 10,
          zIndex: 999,
        }}>
          <View
            style={{
              borderRadius: 25,
              borderColor: colors.text,
              borderWidth: 1,
              padding: 10,
              margin: 10,
              backgroundColor: colors.background,
            }}>
              <TouchableOpacity onPress={() => {
                clear();
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }}>
                <FontAwesomeIcon
                  size={30}
                  icon={faChevronLeft}
                  color={colors.text}
                />
              </TouchableOpacity>
          </View>
        </View>

        {showNavigator && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginRight: 30,
              marginTop: 30,
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

        <RegText color={colors.text} style={{ fontSize: 25, marginTop: showNavigator ? 10 : 30, alignSelf: 'center' }}>Transaction details</RegText>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 10,
        }}>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              margin: 15,
              padding: 10,
              borderRadius: 30,
              backgroundColor: colors.secondary,
              paddingBottom: 40,
            }}>
            <View style={{ 
              padding: 15,
              backgroundColor: colors.background,
              borderRadius: 50,
              marginTop: -60,
             }}>
              <View style={{ 
                padding: 20,
                backgroundColor: colors.secondary,
                borderRadius: 50,
              }}>
                <FontAwesomeIcon
                  style={{ marginLeft: 5, marginRight: 5, marginTop: 0, transform: [{ rotate: '45deg' }] }}
                  size={30}
                  icon={icon}
                  color={amountColor}
                />
              </View>
            </View>

            {false && (
              <BoldText style={{ textAlign: 'center', textTransform: 'capitalize', color: spendColor }}>
                {valueTransfer.kind === ValueTransferKindEnum.Sent && valueTransfer.confirmations === 0
                  ? (translate('history.sending') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.Sent && valueTransfer.confirmations !== 0
                  ? (translate('history.sent') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.Received && valueTransfer.confirmations === 0
                  ? (translate('history.receiving') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.Received && valueTransfer.confirmations !== 0
                  ? (translate('history.received') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.MemoToSelf && valueTransfer.confirmations === 0
                  ? (translate('history.sendingtoself') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.MemoToSelf && valueTransfer.confirmations !== 0
                  ? (translate('history.memotoself') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.SendToSelf && valueTransfer.confirmations === 0
                  ? (translate('history.sendingtoself') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.SendToSelf && valueTransfer.confirmations !== 0
                  ? (translate('history.sendtoself') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.Shield && valueTransfer.confirmations === 0
                  ? (translate('history.shielding') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.Shield && valueTransfer.confirmations !== 0
                  ? (translate('history.shield') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.Rejection && valueTransfer.confirmations === 0
                  ? (translate('history.sending') as string)
                  : valueTransfer.kind === ValueTransferKindEnum.Rejection && valueTransfer.confirmations !== 0
                  ? (translate('history.rejection') as string)
                  : ''}
              </BoldText>
            )}
            <ZecAmount
              currencyName={info.currencyName}
              size={45}
              amtZec={valueTransfer.kind === ValueTransferKindEnum.Received ||
                      valueTransfer.kind === ValueTransferKindEnum.Shield
                        ? valueTransfer.amount
                        : (Number(Utils.splitZecAmountIntoBigSmall(valueTransfer.amount).bigPart) === 0
                          ? valueTransfer.amount 
                          : valueTransfer.amount * (-1))
                      }
              privacy={privacy}
              smallPrefix={true}
            />
          </View>

          {valueTransfer.confirmations >= 0 &&
            valueTransfer.confirmations < GlobalConst.minConfirmations && (
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {(valueTransfer.status === RPCValueTransfersStatusEnum.transmitted ||
                valueTransfer.status === RPCValueTransfersStatusEnum.calculated ||
                valueTransfer.status === RPCValueTransfersStatusEnum.mempool) && (
                <FadeText
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    opacity: 1,
                    fontWeight: '700',
                    textAlign:'center',
                  }}>
                  {(translate(`history.${valueTransfer.status}`) as string) + ' - ' + (translate('history.not-confirmed') as string)}
                </FadeText>
              )}
              {valueTransfer.status === RPCValueTransfersStatusEnum.confirmed &&
                valueTransfer.confirmations >= 0 &&
                valueTransfer.confirmations < GlobalConst.minConfirmations && (
                <FadeText
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    opacity: 1,
                    fontWeight: '700',
                    textAlign: 'left',
                    textDecorationLine: 'none',
                  }}>
                  {(translate(`history.${valueTransfer.status}`) as string) + ' - ' +
                    (translate('history.waiting') as string) + ' (' +
                    GlobalConst.minConfirmations.toString() + ')'}
                </FadeText>
              )}
            </View>
          )}

          <View 
            style={{ 
              alignItems: 'center',
              justifyContent: 'center',
              margin: 15,
              padding: 10,
              borderRadius: 30,
              backgroundColor: colors.secondary,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, width: '100%', borderBottomColor: colors.zingo, borderBottomWidth: 1 }}>
              <FadeText>{'Status'}</FadeText>
              <RegText>{valueTransfer.status}</RegText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, width: '100%', borderBottomColor: colors.zingo, borderBottomWidth: 1 }}>
              <FadeText>{translate('history.confirmations') as string}</FadeText>
              <RegText>{valueTransfer.confirmations >= 0 ? valueTransfer.confirmations.toString() : '-'}</RegText>
            </View>

            {!!valueTransfer.address && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 10, width: '100%', borderBottomColor: colors.zingo, borderBottomWidth: 1 }}>
                <FadeText>{'Receiver'}</FadeText>
                <TouchableOpacity
                  onPress={() => {
                    if (valueTransfer.address) {
                      Clipboard.setString(valueTransfer.address);
                      addLastSnackbar({
                        message: translate('history.addresscopied') as string,
                        duration: SnackbarDurationEnum.short,
                        screenName: [screenName],
                      });
                    }
                  }}>
                  {!valueTransfer.address && <RegText>{'Unknown'}</RegText>}
                  {!!valueTransfer.address && <RegText>{Utils.trimToSmall(valueTransfer.address, 10)}</RegText>}
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 10, width: '100%', borderBottomColor: colors.zingo, borderBottomWidth: 1 }}>
              <FadeText>{'TXID'}</FadeText>
              <TouchableOpacity
                onPress={() => {
                  if (valueTransfer.txid) {
                    Clipboard.setString(valueTransfer.txid);
                    addLastSnackbar({
                      message: translate('history.txcopied') as string,
                      duration: SnackbarDurationEnum.short,
                      screenName: [screenName],
                    });
                  }
                }}>
                {!valueTransfer.txid && <RegText>{'Unknown'}</RegText>}
                {!!valueTransfer.txid && <RegText>{Utils.trimToSmall(valueTransfer.txid, 10)}</RegText>}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, width: '100%', borderBottomColor: colors.zingo, borderBottomWidth: 1 }}>
              <FadeText>{translate('history.time') as string}</FadeText>
              <RegText>{valueTransfer.time ? moment((valueTransfer.time || 0) * 1000).format('MMM D h:mm a') : '--'}</RegText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, width: '100%', borderBottomColor: colors.zingo, borderBottomWidth: 1 }}>
              <FadeText>{'Block height'}</FadeText>
              <RegText>{valueTransfer.blockheight.toString()}</RegText>
            </View>

            {!!valueTransfer.poolType && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, width: '100%', borderBottomColor: colors.zingo, borderBottomWidth: 1 }}>
                <FadeText>{'Receiver type'}</FadeText>
                <RegText>{valueTransfer.poolType}</RegText>
              </View>
            )}

            {!!valueTransfer.fee && valueTransfer.fee > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, width: '100%' }}>
                <FadeText>{translate('history.txfee') as string}</FadeText>
                <ZecAmount amtZec={valueTransfer.fee} size={18} currencyName={info.currencyName} privacy={privacy} />
              </View>
            )}

            {(!!memo || !!memoUA) && false && (
              <View style={{ marginTop: 10 }}>
                <FadeText>{translate('history.memo') as string}</FadeText>
                {!!memo && (
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString(memo);
                      addLastSnackbar({
                        message: translate('history.memocopied') as string,
                        duration: SnackbarDurationEnum.short,
                        screenName: [screenName],
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
                          screenName: [screenName],
                        });
                      }
                      addLastSnackbar({
                        message: translate('history.addresscopied') as string,
                        duration: SnackbarDurationEnum.short,
                        screenName: [screenName],
                      });
                    }}>
                    <RegText>{GlobalConst.replyTo}</RegText>
                    {!thisWalletAddress(memoUA) && (
                      <FontAwesomeIcon icon={faTriangleExclamation} color={'red'} size={18} />
                    )}
                    <RegText style={{ opacity: thisWalletAddress(memoUA) ? 0.6 : 0.4 }}>{memoUA}</RegText>
                    {thisWalletAddress(memoUA) && (
                      <View style={{ flexDirection: 'row' }}>
                        <RegText color={colors.primaryDisabled}>
                          {translate('history.thiswalletaddress') as string}
                        </RegText>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default ValueTransferDetail;
