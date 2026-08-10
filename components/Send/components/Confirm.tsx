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
import { useBiometricGate } from '../../../app/hooks/useBiometricGate';
import { useFullSheetSnapPoints } from '../../../app/hooks/useFullSheetSnapPoints';

import { AppDrawerParamList, ThemeType } from '../../../app/types';
import Utils from '../../../app/utils';
import {
  ButtonTypeEnum,
  ChainNameEnum,
  GlobalConst,
  ScreenEnum,
  RouteEnum,
  SendPageStateClass,
  ProposalPoolsType,
} from '../../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type ConfirmProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Confirm
>;

const poolCrossingKey = ({
  source,
  destination,
}: ProposalPoolsType): string | null => {
  if (source.length === 0 || destination.length === 0) {
    return null;
  }
  if (destination.includes('transparent')) {
    return 'send.deshielded';
  }
  return new Set([...source, ...destination]).size === 1
    ? 'send.private'
    : 'send.amountrevealed';
};

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
    addLastSnackbar,
    server,
    security,
    foregroundEpoch,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Confirm;
  const isMainChain = server.chainName === ChainNameEnum.mainChainName;

  // Audit Issue D — bio gate for security.sendConfirm lives at the
  // Confirm screen entry. Mirrors Seed / Ufvk / Settings / Rescan via
  // the shared hook. Trade-off vs. the previous bio-on-press model: a
  // brief window after auth where the Confirm button can be pressed
  // without re-authenticating. Native stack remounts the screen on each
  // navigation, so leaving and coming back forces a fresh prompt.
  const authPassed = useBiometricGate({
    needsAuth: !!security?.sendConfirm,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
    foregroundAppEnabled: !!security?.foregroundApp,
    foregroundEpoch,
  });

  const [sendingTotal, setSendingTotal] = useState<number>(0);

  const [calculatedFee, setCalculatedFee] = useState<number>(
    !!route.params && route.params.calculatedFee !== undefined
      ? route.params.calculatedFee
      : 0,
  );
  const [proposalPools, setProposalPools] = useState<ProposalPoolsType>(
    !!route.params && route.params.proposalPools !== undefined
      ? route.params.proposalPools
      : { source: [], destination: [] },
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
  // NYM feature hidden for now — will be enabled in the future. Force the
  // local flag to false so any residual `nym: true` carried in route params
  // by a device that had NYM enabled in an earlier app version does not
  // surface NYM-themed UI on this screen (green outline, "Processing via
  // NYM" title, "Privacy Level NYM Enhanced" tag, NYM warning banner).
  // Mirrors the same pattern used to hide the Send-screen toggle at
  // components/Send/Send.tsx L2052-2083 (`{false && (...)}`).
  // Read the route param so the value is still wired into the type system
  // (so when NYM is re-enabled this single line is the only change needed
  // here), but discard it.
  const _routeNym: boolean =
    !!route.params && route.params.nym !== undefined ? route.params.nym : false;
  const nym: boolean = false && _routeNym;

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
    const _proposalPools =
      !!route.params && route.params.proposalPools !== undefined
        ? route.params.proposalPools
        : { source: [], destination: [] };
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
    setProposalPools(_proposalPools);
    setDonationAmount(_donationAmount);
    setSendAllAmount(_sendAllAmount);
    setSendPageState(_sendPageState);
    setMemoTotal(_memoTotal);
  }, [
    route,
    route.params,
    route.params?.calculatedFee,
    route.params?.proposalPools,
    route.params?.donationAmount,
    route.params?.sendAllAmount,
    sendPageState,
    sendPageState.toaddr.memo,
    sendPageState.toaddr.includeUAMemo,
    defaultUnifiedAddress,
  ]);

  const privacyLevelKey = poolCrossingKey(proposalPools);
  const privacyLevel = privacyLevelKey
    ? (translate(privacyLevelKey) as string)
    : '-';

  useEffect(() => {
    const sendingTot =
      Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) +
      calculatedFee +
      donationAmount;
    setSendingTotal(sendingTot);
  }, [calculatedFee, donationAmount, sendPageState.toaddr.amount]);

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
            onPress={async () => await confirmSend(sendPageState)}
          />
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, nym, sendAllAmount, translate],
  );

  if (!authPassed) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

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
          keyboardBehavior={'interactive'}
          keyboardBlurBehavior={'restore'}
          android_keyboardInputMode={'adjustResize'}
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
