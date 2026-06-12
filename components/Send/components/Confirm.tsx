/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { TriangleAlert } from '../../Components/Icons/TriangleAlert';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import BoldText from '../../Components/BoldText';
import ZecAmount from '../../Components/ZecAmount';
import CurrencyAmount from '../../Components/CurrencyAmount';
import Button from '../../Components/Button';
import { useTheme } from '@react-navigation/native';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import AddressItem from '../../Components/AddressItem';
import simpleBiometrics from '../../../app/simpleBiometrics';
import { useFullSheetSnapPoints } from '../../../app/hooks/useFullSheetSnapPoints';

import { AppDrawerParamList, ThemeType } from '../../../app/types';
import Utils from '../../../app/utils';
import {
  ButtonTypeEnum,
  ChainNameEnum,
  PrivacyLevelFromEnum,
  GlobalConst,
  ScreenEnum,
  RouteEnum,
  SendPageStateClass,
} from '../../../app/AppState';
import { RPCAddressKindEnum } from '../../../app/walletBackend/enums/RPCAddressKindEnum';
import { RPCReceiversEnum } from '../../../app/walletBackend/enums/RPCReceiversEnum';
import { RPCParseAddressStatusEnum } from '../../../app/walletBackend/enums/RPCParseAddressStatusEnum';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RPCParseAddressType } from '../../../app/walletBackend/types/RPCParseAddressType';

type ConfirmProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Confirm
>;

const Confirm: React.FunctionComponent<ConfirmProps> = ({
  navigation,
  route,
}) => {
  const confirmSend =
    !!route.params && route.params.confirmSend !== undefined
      ? route.params.confirmSend
      : async () => {};
  const calculateFeeWithPropose =
    !!route.params && route.params.calculateFeeWithPropose !== undefined
      ? route.params.calculateFeeWithPropose
      : async () => {};
  const context = useContext(ContextAppLoaded);
  const {
    info,
    translate,
    currency,
    zecPrice,
    defaultUnifiedAddress,
    privacy,
    totalBalance,
    addLastSnackbar,
    server,
    security,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Confirm;
  const isMainChain = server.chainName === ChainNameEnum.mainChainName;

  const [privacyLevel, setPrivacyLevel] = useState<string | null>(null);
  const [sendingTotal, setSendingTotal] = useState<number>(0);

  const [calculatedFee, setCalculatedFee] = useState<number>(
    !!route.params && route.params.calculatedFee !== undefined
      ? route.params.calculatedFee
      : 0,
  );
  const [parseAddressInfoJSON, setParseAddressInfoJSON] =
    useState<RPCParseAddressType>(
      !!route.params && route.params.parseAddressInfoJSON !== undefined
        ? route.params.parseAddressInfoJSON
        : ({} as RPCParseAddressType),
    );
  const [donationAmount, setDonationAmount] = useState<number>(
    !!route.params && route.params.donationAmount !== undefined
      ? route.params.donationAmount
      : 0,
  );
  const [sendAllAmount, setSendAllAmount] = useState<boolean>(
    !!route.params && route.params.sendAllAmount !== undefined
      ? route.params.sendAllAmount
      : false,
  );
  const [sendPageState, setSendPageState] = useState<SendPageStateClass>(
    !!route.params && route.params.sendPageState !== undefined
      ? route.params.sendPageState
      : ({} as SendPageStateClass),
  );
  const nym: boolean =
    !!route.params && route.params.nym !== undefined ? route.params.nym : false;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const confirmSheetRef = useRef<BottomSheet>(null);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const confirmSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderConfirmHandle = useCallback(
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
            {translate('send.confirm-title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, translate],
  );

  const [memoTotal, setMemoTotal] = useState<string>(
    Utils.buildMemo(
      sendPageState.toaddr.memo,
      sendPageState.toaddr.includeUAMemo,
      defaultUnifiedAddress,
    ),
  );

  useEffect(() => {
    const _calculatedFee =
      !!route.params && route.params?.calculatedFee !== undefined
        ? route.params.calculatedFee
        : 0;
    const _parseAddressInfoJSON =
      !!route.params && route.params.parseAddressInfoJSON !== undefined
        ? route.params.parseAddressInfoJSON
        : ({} as RPCParseAddressType);
    const _donationAmount =
      !!route.params && route.params.donationAmount !== undefined
        ? route.params.donationAmount
        : 0;
    const _sendAllAmount =
      !!route.params && route.params.sendAllAmount !== undefined
        ? route.params.sendAllAmount
        : false;
    const _sendPageState =
      !!route.params && route.params.sendPageState !== undefined
        ? route.params.sendPageState
        : ({} as SendPageStateClass);
    const _memoTotal = Utils.buildMemo(
      sendPageState.toaddr.memo,
      sendPageState.toaddr.includeUAMemo,
      defaultUnifiedAddress,
    );
    setCalculatedFee(_calculatedFee);
    setParseAddressInfoJSON(_parseAddressInfoJSON);
    setDonationAmount(_donationAmount);
    setSendAllAmount(_sendAllAmount);
    setSendPageState(_sendPageState);
    setMemoTotal(_memoTotal);
  }, [
    route,
    route.params,
    route.params?.calculatedFee,
    route.params?.parseAddressInfoJSON,
    route.params?.donationAmount,
    route.params?.sendAllAmount,
    sendPageState,
    sendPageState.toaddr.memo,
    sendPageState.toaddr.includeUAMemo,
    defaultUnifiedAddress,
  ]);

  /**
   * Returns the privacy level for the transaction.
   * It will try to parse the address and determine the privacy level
   * based on the address kind and the senders balance.
   * @returns {string} The privacy level.
   */
  const getPrivacyLevel = useCallback(async () => {
    let from: PrivacyLevelFromEnum = PrivacyLevelFromEnum.nonePrivacyLevel;
    const totalAmount: number = Utils.parseStringLocaleToNumberFloat(
      Utils.parseNumberFloatToStringLocale(
        Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) +
          calculatedFee,
        8,
      ),
    );

    const totalSpendable: number = Utils.parseStringLocaleToNumberFloat(
      Utils.parseNumberFloatToStringLocale(
        totalBalance ? totalBalance.totalSpendableBalance : 0,
        8,
      ),
    );

    //console.log('total', totalAmount);
    //console.log('header spendable', totalBalance?.totalSpendableBalance);

    // amount + fee
    if (
      totalAmount <= (totalBalance ? totalBalance.confirmedOrchardBalance : 0)
    ) {
      from = PrivacyLevelFromEnum.orchardPrivacyLevel;
    } else if (
      (totalBalance ? totalBalance.confirmedOrchardBalance : 0) > 0 &&
      totalAmount <= totalSpendable
    ) {
      from = PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel;
    } else if (
      totalAmount <= (totalBalance ? totalBalance.confirmedSaplingBalance : 0)
    ) {
      from = PrivacyLevelFromEnum.saplingPrivacyLevel;
    }

    //console.log(from);

    if (from === PrivacyLevelFromEnum.nonePrivacyLevel) {
      return '-';
    }

    //console.log('parse-address', sendPageState.toaddr.to, resultJSON.status === RPCParseStatusEnum.successParse);

    if (
      parseAddressInfoJSON.status !==
        RPCParseAddressStatusEnum.successAddressParse ||
      parseAddressInfoJSON.chain_name !== server.chainName
    ) {
      return '-';
    }

    //console.log(from, result, resultJSON);

    // Private -> orchard to orchard (UA with orchard receiver)
    if (
      from === PrivacyLevelFromEnum.orchardPrivacyLevel &&
      parseAddressInfoJSON.address_kind ===
        RPCAddressKindEnum.unifiedAddressKind &&
      parseAddressInfoJSON.receivers_available?.includes(
        RPCReceiversEnum.orchardRPCReceiver,
      )
    ) {
      return translate('send.private') as string;
    }

    // Private -> sapling to sapling (ZA or UA with sapling receiver and NO orchard receiver)
    if (
      from === PrivacyLevelFromEnum.saplingPrivacyLevel &&
      (parseAddressInfoJSON.address_kind ===
        RPCAddressKindEnum.saplingAddressKind ||
        (parseAddressInfoJSON.address_kind ===
          RPCAddressKindEnum.unifiedAddressKind &&
          parseAddressInfoJSON.receivers_available?.includes(
            RPCReceiversEnum.saplingRPCReceiver,
          ) &&
          !parseAddressInfoJSON.receivers_available?.includes(
            RPCReceiversEnum.orchardRPCReceiver,
          )))
    ) {
      return translate('send.private') as string;
    }

    // Amount Revealed -> orchard to sapling (ZA or UA with sapling receiver)
    if (
      from === PrivacyLevelFromEnum.orchardPrivacyLevel &&
      (parseAddressInfoJSON.address_kind ===
        RPCAddressKindEnum.saplingAddressKind ||
        (parseAddressInfoJSON.address_kind ===
          RPCAddressKindEnum.unifiedAddressKind &&
          parseAddressInfoJSON.receivers_available?.includes(
            RPCReceiversEnum.saplingRPCReceiver,
          )))
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Amount Revealed -> sapling to orchard (UA with orchard receiver)
    if (
      from === PrivacyLevelFromEnum.saplingPrivacyLevel &&
      parseAddressInfoJSON.address_kind ===
        RPCAddressKindEnum.unifiedAddressKind &&
      parseAddressInfoJSON.receivers_available?.includes(
        RPCReceiversEnum.orchardRPCReceiver,
      )
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Amount Revealed -> sapling+orchard to orchard or sapling (UA with orchard receiver or ZA or
    // UA with sapling receiver)
    if (
      from === PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel &&
      (parseAddressInfoJSON.address_kind ===
        RPCAddressKindEnum.saplingAddressKind ||
        (parseAddressInfoJSON.address_kind ===
          RPCAddressKindEnum.unifiedAddressKind &&
          (parseAddressInfoJSON.receivers_available?.includes(
            RPCReceiversEnum.orchardRPCReceiver,
          ) ||
            parseAddressInfoJSON.receivers_available?.includes(
              RPCReceiversEnum.saplingRPCReceiver,
            ))))
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Deshielded -> orchard or sapling or orchard+sapling to transparent
    if (
      (from === PrivacyLevelFromEnum.orchardPrivacyLevel ||
        from === PrivacyLevelFromEnum.saplingPrivacyLevel ||
        from === PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel) &&
      (parseAddressInfoJSON.address_kind ===
        RPCAddressKindEnum.transparentAddressKind ||
        parseAddressInfoJSON.address_kind === RPCAddressKindEnum.texAddressKind)
    ) {
      return translate('send.deshielded') as string;
    }

    // whatever else
    return '-';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    calculatedFee,
    sendPageState.toaddr.amount,
    sendPageState.toaddr.to,
    server.chainName,
    totalBalance,
    totalBalance?.confirmedOrchardBalance,
    totalBalance?.confirmedSaplingBalance,
    translate,
  ]);

  const confirmSendBiometrics = async () => {
    const resultBio = security.sendConfirm
      ? await simpleBiometrics({ translate: translate })
      : true;
    // resultBio:
    // - true      -> authenticated (biometric, or device passcode via allowDeviceCredentials)
    // - false     -> user cancelled or failed the prompt
    // - undefined -> device has no auth method at all; allow (cannot lock the user out)
    if (resultBio === false) {
      // snack with Error
      addLastSnackbar(translate('biometrics-error') as string);
    } else {
      await confirmSend(sendPageState);
    }
  };

  useEffect(() => {
    const sendingTot =
      Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) +
      calculatedFee +
      donationAmount;
    setSendingTotal(sendingTot);
  }, [calculatedFee, donationAmount, sendPageState.toaddr.amount]);

  useEffect(() => {
    (async () => {
      setPrivacyLevel(await getPrivacyLevel());
    })();
  }, [getPrivacyLevel]);

  useEffect(() => {
    calculateFeeWithPropose(
      sendPageState.toaddr.amount,
      sendPageState.toaddr.to,
      sendPageState.toaddr.memo,
      sendPageState.toaddr.includeUAMemo,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderConfirmFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingTop: 10,
            paddingBottom: 24,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            type={nym ? ButtonTypeEnum.Nym : ButtonTypeEnum.Primary}
            title={
              sendAllAmount
                ? (translate('send.confirm-button-all') as string)
                : (translate('confirm') as string)
            }
            onPress={async () => await confirmSendBiometrics()}
          />
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, nym, sendAllAmount, translate],
  );

  return (
    <View style={{ flex: 1 }}>
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
            noPrivacy={true}
            noUfvkIcon={true}
          />
        </View>
        <BottomSheet
          ref={confirmSheetRef}
          snapPoints={confirmSnapPoints}
          index={0}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          enableContentPanningGesture={false}
          backgroundStyle={{
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
          handleComponent={renderConfirmHandle}
          footerComponent={renderConfirmFooter}
        >
          <BottomSheetScrollView
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            indicatorStyle={'white'}
            testID="send.confirm.scroll-view"
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
              paddingBottom: 80,
            }}
          >
            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: 25,
                padding: 10,
                borderWidth: 1,
                borderRadius: 10,
                borderColor: nym ? '#07FF94' : colors.border,
              }}
            >
              <RegText
                style={{ textAlign: 'center', textTransform: 'capitalize' }}
              >
                {nym
                  ? (translate('send.nym-processing-title') as string)
                  : (translate('send.sending-title') as string)}
              </RegText>

              <ZecAmount
                currencyName={info.currencyName}
                amtZec={sendingTotal}
                privacy={false}
                size={28}
                smallPrefix={true}
              />
              {isMainChain && (
                <CurrencyAmount
                  amtZec={sendingTotal}
                  price={zecPrice.zecPrice}
                  currency={currency}
                  privacy={false}
                />
              )}
            </View>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <View style={{ margin: 10 }}>
                <FadeText>
                  {translate('send.confirm-privacy-level') as string}
                </FadeText>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  {!privacyLevel ? (
                    <ActivityIndicator
                      size={
                        Platform.OS === GlobalConst.platformOSios ? 'small' : 12
                      }
                      color={colors.primary}
                    />
                  ) : (
                    <RegText>{privacyLevel}</RegText>
                  )}
                  {nym && (
                    <RegText style={{ color: '#07FF94' }}>
                      {translate('send.nym-enhanced') as string}
                    </RegText>
                  )}
                </View>
              </View>
            </View>

            <FadeText style={{ marginTop: 0, marginLeft: 10 }}>
              {translate('send.fee') as string}
            </FadeText>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginHorizontal: 10,
              }}
            >
              <ZecAmount
                currencyName={info.currencyName}
                size={14}
                amtZec={calculatedFee}
                privacy={privacy}
              />
              {isMainChain && (
                <CurrencyAmount
                  style={{ fontSize: 18 }}
                  amtZec={calculatedFee}
                  price={zecPrice.zecPrice}
                  currency={currency}
                  privacy={privacy}
                />
              )}
            </View>

            {[sendPageState.toaddr].map(to => {
              return (
                <View key={`${to.id}-${to.to}`} style={{ margin: 10 }}>
                  <FadeText>{translate('send.to') as string}</FadeText>
                  <AddressItem
                    address={to.to}
                    screenName={screenName}
                    withIcon={true}
                  />

                  {donationAmount > 0 && (
                    <>
                      <FadeText style={{ marginTop: 10 }}>
                        {translate('send.confirm-donation') as string}
                      </FadeText>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <ZecAmount
                          currencyName={info.currencyName}
                          size={14}
                          amtZec={donationAmount}
                          privacy={privacy}
                        />
                        {isMainChain && (
                          <CurrencyAmount
                            style={{ fontSize: 18 }}
                            amtZec={donationAmount}
                            price={zecPrice.zecPrice}
                            currency={currency}
                            privacy={privacy}
                          />
                        )}
                      </View>
                    </>
                  )}

                  <FadeText style={{ marginTop: 10 }}>
                    {translate('send.confirm-amount') as string}
                  </FadeText>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <ZecAmount
                      currencyName={info.currencyName}
                      size={14}
                      amtZec={Utils.parseStringLocaleToNumberFloat(to.amount)}
                      privacy={privacy}
                    />
                    {isMainChain && (
                      <CurrencyAmount
                        style={{ fontSize: 18 }}
                        amtZec={Utils.parseStringLocaleToNumberFloat(to.amount)}
                        price={zecPrice.zecPrice}
                        currency={currency}
                        privacy={privacy}
                      />
                    )}
                  </View>
                  {!!memoTotal && (
                    <>
                      <FadeText style={{ marginTop: 10 }}>
                        {translate('send.confirm-memo') as string}
                      </FadeText>
                      <RegText testID="send.confirm-memo" selectable={true}>
                        {memoTotal}
                      </RegText>
                    </>
                  )}
                </View>
              );
            })}
            {nym && (
              <View
                style={{
                  margin: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: '#07FF94',
                  backgroundColor: '#07252B',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <TriangleAlert
                  size={20}
                  color={'#07FF94'}
                  style={{ marginRight: 6 }}
                />
                <RegText style={{ flex: 1, fontSize: 13, color: '#87919B' }}>
                  {translate('send.nym-warning') as string}
                </RegText>
              </View>
            )}
            <View style={{ marginBottom: 30 }} />
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </View>
  );
};

export default Confirm;
