/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View, TouchableOpacity, Linking, Text } from 'react-native';
import { showConfirm } from '../../../app/showConfirm';

import Clipboard from '@react-native-clipboard/clipboard';

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';

import {
  AddressBookFileClass,
  ChainNameEnum,
  SnackbarDurationEnum,
  ValueTransferType,
  ValueTransferKindEnum,
  GlobalConst,
  ButtonTypeEnum,
  SelectServerEnum,
  RouteEnum,
  TransactionActionEnum,
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
import Header from '../../Header';
import BoldText from '../../Components/BoldText';
import CurrencyAmount from '../../Components/CurrencyAmount';
import AddressItem from '../../Components/AddressItem';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
// this is for http. (red)
import {
  faChevronLeft,
  faTriangleExclamation,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFullSheetSnapPoints } from '../../../app/hooks/useFullSheetSnapPoints';
import { RPCValueTransfersStatusEnum } from '../../../app/walletBackend/enums/RPCValueTransfersStatusEnum';
import Button from '../../Components/Button';
import { removeTransaction } from '../../../app/walletBackend';
import { createAlert } from '../../../app/createAlert';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
// this is for https. (primary)
//import { faLock } from '@fortawesome/free-solid-svg-icons';

type ValueTransferDetailProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.ValueTransferDetail
>;

const ValueTransferDetail: React.FunctionComponent<
  ValueTransferDetailProps
> = ({ route }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
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
    setBackgroundError,
    netInfo,
    selectServer,
    setPrivacyOption,
    blockExplorer,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.ValueTransferDetail;

  const [valueTransfer, setValueTransfer] = useState<ValueTransferType>(
    !!route.params && route.params.vt !== undefined
      ? route.params.vt
      : ({} as ValueTransferType),
  );
  const [valueTransferIndex, setValueTransferIndex] = useState<number>(
    !!route.params && route.params.index !== undefined ? route.params.index : 0,
  );
  const [valueTransfersSliced, setValueTransfersSliced] = useState<
    ValueTransferType[]
  >(
    !!route.params && route.params.valueTransfersSliced !== undefined
      ? route.params.valueTransfersSliced
      : ([] as ValueTransferType[]),
  );
  const [totalLength, setTotalLength] = useState<number>(
    !!route.params && route.params.totalLength !== undefined
      ? route.params.totalLength
      : 0,
  );
  const [spendColor, setSpendColor] = useState<string>(colors.primaryDisabled);
  const [expandTxid, setExpandTxid] = useState<boolean>(false);
  const [showNavigator, setShowNavigator] = useState<boolean>(true);
  const [addressProtected, setAddressProtected] = useState<boolean>(true);
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const isTheFirstMount = useRef(true);
  const vtdSheetRef = useRef<BottomSheet>(null);

  const closeScreen = useCallback(() => {
    // Pop the current screen instead of pushing a new instance of the
    // previous route — `navigate` would leave Detail alive in the stack
    // and the iOS edge-swipe (or back gesture) could land back on it.
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const vtdSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderVtdHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={closeScreen}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('history.details') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, translate],
  );

  const { memo, memoUA } = Utils.splitMemo(valueTransfer.memos);

  useEffect(() => {
    const _index =
      !!route.params && route.params.index !== undefined
        ? route.params.index
        : 0;
    const _vt =
      !!route.params && route.params.vt !== undefined
        ? route.params.vt
        : ({} as ValueTransferType);
    const _valueTransfersSliced =
      !!route.params && route.params.valueTransfersSliced !== undefined
        ? route.params.valueTransfersSliced
        : ([] as ValueTransferType[]);
    const _totalLength =
      !!route.params && route.params.totalLength !== undefined
        ? route.params.totalLength
        : 0;
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
      valueTransfer.status === RPCValueTransfersStatusEnum.failed
        ? colors.zingo
        : valueTransfer.confirmations >= 0 &&
            valueTransfer.confirmations < GlobalConst.minConfirmations
          ? colors.primaryDisabled
          : valueTransfer.kind === ValueTransferKindEnum.Received ||
              valueTransfer.kind === ValueTransferKindEnum.Shield
            ? colors.primary
            : colors.text;
    setSpendColor(spendCo);
  }, [
    colors.primary,
    colors.primaryDisabled,
    colors.text,
    colors.zingo,
    valueTransfer.confirmations,
    valueTransfer.kind,
    valueTransfer.status,
  ]);

  useEffect(() => {
    (async () => {
      setAddressProtected(
        await isAddressProtected(
          valueTransfer.address ? valueTransfer.address : '',
        ),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueTransfer.address]);

  const handleTxIDClick = async (txid?: string) => {
    if (!txid) {
      return;
    }

    const url = Utils.getBlockExplorerTxIDURL(
      txid,
      server.chainName,
      blockExplorer,
    );
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.log("Don't know how to open URI: " + url);
    }
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
      (ab: AddressBookFileClass) => ab.address === add,
    );
    return contact.length >= 1;
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

  const isAddressProtected: (add: string) => Promise<boolean> = async (
    add: string,
  ) => {
    return zenniesDonationAddress === add;
  };

  const moveValueTransferDetail = (indexParm: number, typeParm: number) => {
    // -1 -> Previous ValueTransfer
    //  1 -> Next ValueTransfer
    if (
      (indexParm > 0 && typeParm === -1) ||
      (indexParm < valueTransfersSliced.length - 1 && typeParm === 1)
    ) {
      const newIndex = indexParm + typeParm;
      setValueTransfer(valueTransfersSliced[newIndex]);
      setValueTransferIndex(newIndex);
    }
  };

  const runAction = async (action: TransactionActionEnum) => {
    if (!setBackgroundError || !addLastSnackbar) {
      return;
    }
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      return;
    }

    // not use await here.
    navigation.navigate(RouteEnum.Computing);

    let actionStr: string = await removeTransaction(valueTransfer.txid);

    console.log('REMOVE', actionStr);

    if (actionStr) {
      if (actionStr.toLowerCase().startsWith(GlobalConst.error)) {
        createAlert(
          setBackgroundError,
          addLastSnackbar,
          translate(`history.${action}-title`) as string,
          `${translate(`history.${action}-error`)} ${actionStr}`,
          false,
          translate,
        );
      } else {
        createAlert(
          setBackgroundError,
          addLastSnackbar,
          translate(`history.${action}-title`) as string,
          `${translate(`history.${action}-message`)} ${actionStr}`,
          true,
          translate,
        );
      }
    }
    // change to the history screen, just in case.
    navigation.navigate(RouteEnum.HomeStack, {
      screen: RouteEnum.History,
    });
  };

  const actionOnPress = (action: TransactionActionEnum) => {
    showConfirm({
      title: translate(`history.${action}-title`) as string,
      message: translate(`history.${action}-alert`) as string,
      buttons: [
        {
          text: translate('confirm') as string,
          onPress: () => runAction(action),
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
        />
      </View>
      <BottomSheet
        ref={vtdSheetRef}
        snapPoints={vtdSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderVtdHandle}
      >
        {showNavigator && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginRight: 30,
              marginTop: 5,
              backgroundColor: colors.bottomSheetBackground,
            }}
          >
            <TouchableOpacity
              onPress={() => moveValueTransferDetail(valueTransferIndex, -1)}
              style={{ marginRight: 25 }}
              disabled={valueTransferIndex === 0}
            >
              <FontAwesomeIcon
                icon={faChevronUp}
                color={
                  valueTransferIndex === 0
                    ? colors.primaryDisabled
                    : colors.primary
                }
                size={24}
              />
            </TouchableOpacity>
            <FadeText>{(valueTransferIndex + 1).toString()}</FadeText>
            <TouchableOpacity
              onPress={() => moveValueTransferDetail(valueTransferIndex, 1)}
              style={{ marginLeft: 25 }}
              disabled={valueTransferIndex === valueTransfersSliced.length - 1}
            >
              <FontAwesomeIcon
                icon={faChevronDown}
                color={
                  valueTransferIndex === valueTransfersSliced.length - 1
                    ? colors.primaryDisabled
                    : colors.primary
                }
                size={24}
              />
            </TouchableOpacity>
          </View>
        )}
        <BottomSheetScrollView
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle={'white'}
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bottomSheetBackground,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: 25,
              marginTop: showNavigator ? 5 : 25,
              padding: 10,
              borderWidth: 1,
              borderRadius: 10,
              borderColor:
                valueTransfer.status === RPCValueTransfersStatusEnum.failed
                  ? 'coral'
                  : colors.border,
            }}
          >
            <BoldText
              style={{
                textAlign: 'center',
                textTransform: 'capitalize',
                color: spendColor,
              }}
            >
              {valueTransfer.status === RPCValueTransfersStatusEnum.failed &&
              valueTransfer.kind === ValueTransferKindEnum.Sent
                ? (translate('history.sent-failed') as string)
                : valueTransfer.status === RPCValueTransfersStatusEnum.failed &&
                    valueTransfer.kind === ValueTransferKindEnum.Shield
                  ? (translate('history.shield-failed') as string)
                  : valueTransfer.status ===
                        RPCValueTransfersStatusEnum.failed &&
                      valueTransfer.kind === ValueTransferKindEnum.Received
                    ? (translate('history.received-failed') as string)
                    : valueTransfer.kind === ValueTransferKindEnum.Sent &&
                        valueTransfer.confirmations === 0
                      ? (translate('history.sending') as string)
                      : valueTransfer.kind === ValueTransferKindEnum.Sent &&
                          valueTransfer.confirmations !== 0
                        ? (translate('history.sent') as string)
                        : valueTransfer.kind ===
                              ValueTransferKindEnum.Received &&
                            valueTransfer.confirmations === 0
                          ? (translate('history.receiving') as string)
                          : valueTransfer.kind ===
                                ValueTransferKindEnum.Received &&
                              valueTransfer.confirmations !== 0
                            ? (translate('history.received') as string)
                            : valueTransfer.kind ===
                                  ValueTransferKindEnum.MemoToSelf &&
                                valueTransfer.confirmations === 0
                              ? (translate('history.sendingtoself') as string)
                              : valueTransfer.kind ===
                                    ValueTransferKindEnum.MemoToSelf &&
                                  valueTransfer.confirmations !== 0
                                ? (translate('history.memotoself') as string)
                                : valueTransfer.kind ===
                                      ValueTransferKindEnum.SendToSelf &&
                                    valueTransfer.confirmations === 0
                                  ? (translate(
                                      'history.sendingtoself',
                                    ) as string)
                                  : valueTransfer.kind ===
                                        ValueTransferKindEnum.SendToSelf &&
                                      valueTransfer.confirmations !== 0
                                    ? (translate(
                                        'history.sendtoself',
                                      ) as string)
                                    : valueTransfer.kind ===
                                          ValueTransferKindEnum.Shield &&
                                        valueTransfer.confirmations === 0
                                      ? (translate(
                                          'history.shielding',
                                        ) as string)
                                      : valueTransfer.kind ===
                                            ValueTransferKindEnum.Shield &&
                                          valueTransfer.confirmations !== 0
                                        ? (translate(
                                            'history.shield',
                                          ) as string)
                                        : valueTransfer.kind ===
                                              ValueTransferKindEnum.Rejection &&
                                            valueTransfer.confirmations === 0
                                          ? (translate(
                                              'history.sending',
                                            ) as string)
                                          : valueTransfer.kind ===
                                                ValueTransferKindEnum.Rejection &&
                                              valueTransfer.confirmations !== 0
                                            ? (translate(
                                                'history.rejection',
                                              ) as string)
                                            : ''}
            </BoldText>
            <ZecAmount
              style={{
                opacity:
                  valueTransfer.status === RPCValueTransfersStatusEnum.failed
                    ? 0.5
                    : 1,
              }}
              currencyName={info.currencyName}
              size={28}
              amtZec={valueTransfer.amount}
              privacy={privacy}
              smallPrefix={true}
            />
            {!!valueTransfer.zecPrice &&
              valueTransfer.zecPrice > 0 &&
              server.chainName === ChainNameEnum.mainChainName && (
                <CurrencyAmount
                  price={valueTransfer.zecPrice}
                  amtZec={valueTransfer.amount}
                  currency={currency}
                  privacy={privacy}
                />
              )}
          </View>

          {valueTransfer.confirmations ===
            0 /* not min confirmations applied */ && (
            <>
              {valueTransfer.status === RPCValueTransfersStatusEnum.failed && (
                <>
                  <View
                    style={{
                      flexGrow: 1,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Button
                      type={ButtonTypeEnum.Primary}
                      title={translate('history.remove') as string}
                      onPress={() => {
                        actionOnPress(TransactionActionEnum.remove);
                      }}
                    />
                  </View>
                </>
              )}
            </>
          )}

          {valueTransfer.confirmations >= 0 &&
            valueTransfer.confirmations < GlobalConst.minConfirmations && (
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(valueTransfer.status ===
                  RPCValueTransfersStatusEnum.transmitted ||
                  valueTransfer.status ===
                    RPCValueTransfersStatusEnum.calculated) && (
                  <FontAwesomeIcon
                    style={{ marginRight: 5 }}
                    icon={faTriangleExclamation}
                    color={colors.syncing}
                    size={12}
                  />
                )}
                {(valueTransfer.status ===
                  RPCValueTransfersStatusEnum.transmitted ||
                  valueTransfer.status ===
                    RPCValueTransfersStatusEnum.calculated ||
                  valueTransfer.status ===
                    RPCValueTransfersStatusEnum.mempool ||
                  valueTransfer.status ===
                    RPCValueTransfersStatusEnum.failed) && (
                  <FadeText
                    style={{
                      color:
                        valueTransfer.status ===
                        RPCValueTransfersStatusEnum.failed
                          ? 'coral'
                          : valueTransfer.status ===
                                RPCValueTransfersStatusEnum.transmitted ||
                              valueTransfer.status ===
                                RPCValueTransfersStatusEnum.calculated
                            ? colors.primary
                            : colors.primaryDisabled,
                      fontSize: 12,
                      opacity: 1,
                      fontWeight: '700',
                      textAlign:
                        valueTransfer.status ===
                          RPCValueTransfersStatusEnum.transmitted ||
                        valueTransfer.status ===
                          RPCValueTransfersStatusEnum.calculated
                          ? 'center'
                          : 'left',
                      textDecorationLine:
                        valueTransfer.status ===
                          RPCValueTransfersStatusEnum.transmitted ||
                        valueTransfer.status ===
                          RPCValueTransfersStatusEnum.calculated
                          ? 'underline'
                          : 'none',
                    }}
                  >
                    {(translate(`history.${valueTransfer.status}`) as string) +
                      ' - ' +
                      (translate('history.not-confirmed') as string)}
                  </FadeText>
                )}
                {valueTransfer.status ===
                  RPCValueTransfersStatusEnum.confirmed &&
                  valueTransfer.confirmations >= 0 &&
                  valueTransfer.confirmations <
                    GlobalConst.minConfirmations && (
                    <FadeText
                      style={{
                        color: colors.primaryDisabled,
                        fontSize: 12,
                        opacity: 1,
                        fontWeight: '700',
                        textAlign: 'left',
                        textDecorationLine: 'none',
                      }}
                    >
                      {(translate(
                        `history.${valueTransfer.status}`,
                      ) as string) +
                        ' - ' +
                        (translate('history.waiting') as string) +
                        ' (' +
                        GlobalConst.minConfirmations.toString() +
                        ')'}
                    </FadeText>
                  )}
              </View>
            )}

          <View style={{ margin: 10 }}>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 10,
              }}
            >
              <View style={{ display: 'flex' }}>
                <FadeText>{translate('history.time') as string}</FadeText>
                <RegText
                  style={{
                    opacity:
                      valueTransfer.status ===
                      RPCValueTransfersStatusEnum.failed
                        ? 0.5
                        : 1,
                  }}
                >
                  {valueTransfer.time
                    ? Utils.formatDate(
                        (valueTransfer.time || 0) * 1000,
                        'yyyy MMM d h:mm aaa',
                        language,
                      )
                    : '--'}
                </RegText>
              </View>
              <View style={{ display: 'flex', alignItems: 'flex-end' }}>
                <FadeText>
                  {translate('history.confirmations') as string}
                </FadeText>
                <RegText
                  style={{
                    opacity:
                      valueTransfer.status ===
                      RPCValueTransfersStatusEnum.failed
                        ? 0.5
                        : 1,
                  }}
                >
                  {valueTransfer.confirmations >= 0
                    ? valueTransfer.confirmations.toString()
                    : '-'}
                </RegText>
              </View>
            </View>

            <View
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginTop: 10,
              }}
            >
              <FadeText>{translate('history.txid') as string}</FadeText>
              <TouchableOpacity
                onPress={() => {
                  if (valueTransfer.txid) {
                    Clipboard.setString(valueTransfer.txid);
                    addLastSnackbar(
                      translate('history.txcopied') as string,
                      SnackbarDurationEnum.short,
                    );
                    setExpandTxid(true);
                  }
                }}
              >
                {!valueTransfer.txid && (
                  <RegText
                    style={{
                      opacity:
                        valueTransfer.status ===
                        RPCValueTransfersStatusEnum.failed
                          ? 0.5
                          : 1,
                    }}
                  >
                    {'Unknown'}
                  </RegText>
                )}
                {!expandTxid && !!valueTransfer.txid && (
                  <RegText
                    style={{
                      opacity:
                        valueTransfer.status ===
                        RPCValueTransfersStatusEnum.failed
                          ? 0.5
                          : 1,
                    }}
                  >
                    {Utils.trimToSmall(valueTransfer.txid, 10)}
                  </RegText>
                )}
                {expandTxid && !!valueTransfer.txid && (
                  <>
                    <RegText
                      style={{
                        opacity:
                          valueTransfer.status ===
                          RPCValueTransfersStatusEnum.failed
                            ? 0.5
                            : 1,
                      }}
                    >
                      {valueTransfer.txid}
                    </RegText>
                    {server.chainName !== ChainNameEnum.regtestChainName &&
                      valueTransfer.status !==
                        RPCValueTransfersStatusEnum.failed && (
                        <TouchableOpacity
                          onPress={() => handleTxIDClick(valueTransfer.txid)}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              textDecorationLine: 'underline',
                              margin: 15,
                            }}
                          >
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
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <ZecAmount
                    style={{
                      opacity:
                        valueTransfer.status ===
                        RPCValueTransfersStatusEnum.failed
                          ? 0.5
                          : 1,
                    }}
                    amtZec={valueTransfer.fee}
                    size={14}
                    currencyName={info.currencyName}
                    privacy={privacy}
                  />
                </View>
              </View>
            )}

            {!!valueTransfer.address && (
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  marginTop: 10,
                }}
              >
                <FadeText>{translate('history.address') as string}</FadeText>
                <AddressItem
                  address={valueTransfer.address}
                  screenName={screenName}
                  withIcon={true}
                  withSendIcon={true}
                  addressProtected={addressProtected}
                />
              </View>
            )}

            {!!valueTransfer.poolType && (
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  marginTop: 10,
                }}
              >
                <FadeText>{translate('history.pool') as string}</FadeText>
                <RegText
                  style={{
                    opacity:
                      valueTransfer.status ===
                      RPCValueTransfersStatusEnum.failed
                        ? 0.5
                        : 1,
                  }}
                >
                  {valueTransfer.poolType}
                </RegText>
              </View>
            )}

            <View style={{ marginTop: 10 }}>
              <FadeText>{translate('history.amount') as string}</FadeText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <ZecAmount
                  style={{
                    opacity:
                      valueTransfer.status ===
                      RPCValueTransfersStatusEnum.failed
                        ? 0.5
                        : 1,
                  }}
                  amtZec={valueTransfer.amount}
                  size={14}
                  currencyName={info.currencyName}
                  privacy={privacy}
                />
                {!!valueTransfer.zecPrice &&
                  valueTransfer.zecPrice > 0 &&
                  server.chainName === ChainNameEnum.mainChainName && (
                    <CurrencyAmount
                      price={valueTransfer.zecPrice}
                      amtZec={valueTransfer.amount}
                      currency={currency}
                      privacy={privacy}
                    />
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
                    <RegText>{GlobalConst.replyTo}</RegText>
                    {!thisWalletAddress(memoUA) && (
                      <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        color={'red'}
                        size={14}
                      />
                    )}
                    <RegText
                      style={{ opacity: thisWalletAddress(memoUA) ? 0.6 : 0.4 }}
                    >
                      {memoUA}
                    </RegText>
                    {contactFound(memoUA) && (
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
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default ValueTransferDetail;
