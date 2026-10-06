/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useAtomValue } from 'jotai';
import Animated, {
  Easing,
  EntryExitAnimationFunction,
  FadeIn,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  RouteEnum,
  ServerType,
  SnackbarDurationEnum,
  TranslateType,
} from '@app/AppState';
import { balanceAtom } from '@app/AppState/balance';
import InfoType from '@app/AppState/types/InfoType';
import { fiatQuote } from '@app/price/fiatQuote';
import ZecPriceType from '@app/AppState/types/ZecPriceType';
import {
  MixnetView,
  sendGateOpen,
  shownStatusKey,
} from '@app/walletBackend/transforms/mixnetView';
import Utils from '@app/utils';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import CurrencyAmount from '@ui/widgets/CurrencyAmount';
import FadeText from '@ui/primitives/FadeText';
import PriceFetcher from '@ui/widgets/PriceFetcher';
import RegText from '@ui/primitives/RegText';
import ZecAmount from '@ui/widgets/ZecAmount';
import PrivacyToggle from './PrivacyToggle';

const BALANCE_BOTTOM_GAP = 20;
const REVEAL_MS = 220;
const REVEAL_EASE = Easing.bezier(0.23, 1, 0.32, 1);

// The fiat row settles into place from a slightly smaller, transparent copy.
const materialize: EntryExitAnimationFunction = () => {
  'worklet';
  const timing = { duration: REVEAL_MS, easing: REVEAL_EASE };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.94 }] },
    animations: {
      opacity: withTiming(1, timing),
      transform: [{ scale: withTiming(1, timing) }],
    },
  };
};

type BalanceRowProps = {
  noBalance: boolean | undefined;
  noPrivacy: boolean | undefined;
  setPrivacyOption: ((value: boolean) => Promise<void>) | undefined;
  addLastSnackbar:
    ((msg: string, duration?: SnackbarDurationEnum) => void) | undefined;
  privacy: boolean;
  translate: (key: string) => TranslateType;
  info: InfoType;
  zecPrice: ZecPriceType;
  server: ServerType;
  showShieldButton: boolean;
  shieldingFee: number;
  valueTransfersTotal: number | null;
  calculateAmountToShield: () => string;
  calculatePoolsToShield: () => string;
  calculateDisableButtonToShield: () => boolean;
  onPressShieldFunds: () => void;
  receivedLegend: boolean | undefined;
  mixnetView: MixnetView;
  onUsdRowLayout?: (height: number) => void;
};

const BalanceRow: React.FC<BalanceRowProps> = React.memo(
  ({
    noBalance,
    noPrivacy,
    setPrivacyOption,
    addLastSnackbar,
    privacy,
    translate,
    info,
    zecPrice,
    server,
    showShieldButton,
    shieldingFee,
    valueTransfersTotal,
    calculateAmountToShield,
    calculatePoolsToShield,
    calculateDisableButtonToShield,
    onPressShieldFunds,
    receivedLegend,
    mixnetView,
    onUsdRowLayout,
  }) => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { colors } = useTheme();
    const reducedMotion = useReducedMotion();
    const balance = useAtomValue(balanceAtom);
    const quote = fiatQuote(zecPrice, server, info.chainName);
    const showFiat = !noBalance && quote.kind === 'quote';

    return (
      <>
        {!noBalance && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 10,
              // Without the fiat row the balance keeps the same air below as above.
              marginBottom: showFiat ? 0 : BALANCE_BOTTOM_GAP,
            }}
          >
            {!noPrivacy && setPrivacyOption && addLastSnackbar && (
              <PrivacyToggle
                privacy={privacy}
                setPrivacyOption={setPrivacyOption}
                addLastSnackbar={addLastSnackbar}
                translate={translate}
              />
            )}
            <ZecAmount
              currencyName={info.currencyName}
              color={colors.fgDefault}
              size={36}
              amtZec={
                balance.kind === 'polled'
                  ? balance.latest.totalIronwoodBalance +
                    balance.latest.totalOrchardBalance +
                    balance.latest.totalSaplingBalance +
                    balance.latest.totalTransparentBalance
                  : 0
              }
              privacy={privacy}
              smallPrefix={true}
            />
            {balance.kind === 'polled' &&
              (balance.latest.totalOrchardBalance !==
                balance.latest.confirmedOrchardBalance ||
                balance.latest.totalIronwoodBalance > 0 ||
                balance.latest.totalSaplingBalance > 0 ||
                balance.latest.totalTransparentBalance > 0) && (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate(RouteEnum.Pools);
                  }}
                >
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.bgCanvas,
                      borderRadius: 10,
                      margin: 0,
                      marginLeft: 5,
                      padding: 0,
                      minWidth: 25,
                      minHeight: 25,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      size={20}
                      color={colors.fgAccent}
                    />
                  </View>
                </TouchableOpacity>
              )}
          </View>
        )}

        {receivedLegend &&
          balance.kind === 'polled' &&
          balance.latest.totalIronwoodBalance +
            balance.latest.totalOrchardBalance +
            balance.latest.totalSaplingBalance >
            0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
              }}
            >
              <RegText color={colors.fgAccent}>
                {translate('seed.youreceived') as string}
              </RegText>
              <ZecAmount
                currencyName={info.currencyName}
                color={colors.fgAccent}
                size={14}
                amtZec={
                  balance.latest.totalIronwoodBalance +
                  balance.latest.totalOrchardBalance +
                  balance.latest.totalSaplingBalance
                }
                privacy={privacy}
              />
              <RegText color={colors.fgAccent}>!!!</RegText>
            </View>
          )}

        {showFiat && (
          <Animated.View
            entering={reducedMotion ? FadeIn.duration(REVEAL_MS) : materialize}
            onLayout={e => onUsdRowLayout?.(e.nativeEvent.layout.height)}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <CurrencyAmount
              style={{ marginTop: 0, marginBottom: 0 }}
              priceDate={quote.date}
              price={quote.price}
              amtZec={
                balance.kind === 'polled'
                  ? balance.latest.totalIronwoodBalance +
                    balance.latest.totalOrchardBalance +
                    balance.latest.totalSaplingBalance +
                    balance.latest.totalTransparentBalance
                  : 0
              }
              privacy={privacy}
            />
            <View style={{ marginLeft: 5 }}>
              <PriceFetcher />
            </View>
          </Animated.View>
        )}

        {showShieldButton &&
          !noBalance &&
          !calculateDisableButtonToShield() &&
          valueTransfersTotal !== null && (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              {mixnetView.kind === 'transport' && mixnetView.sendBlocked ? (
                <View
                  style={{ alignItems: 'center' }}
                  testID="header.shield-blocked"
                >
                  <FadeText style={{ fontSize: 8 }}>
                    {translate('send.nym-blocked') as string}
                  </FadeText>
                  <FadeText style={{ fontSize: 8 }}>
                    {translate(shownStatusKey(mixnetView)) as string}
                  </FadeText>
                </View>
              ) : (
                <FadeText style={{ fontSize: 8 }}>
                  {(translate(
                    `history.shield-legend-${calculatePoolsToShield()}`,
                  ) as string) +
                    ` ${calculateAmountToShield()} ` +
                    (translate('send.fee') as string) +
                    ': ' +
                    Utils.parseNumberFloatToStringLocale(shieldingFee, 8) +
                    ' '}
                </FadeText>
              )}
              <View style={{ margin: 5, flexDirection: 'row' }}>
                <Button
                  testID="header.shield"
                  type={ButtonTypeEnum.Primary}
                  title={
                    translate(
                      `history.shield-${calculatePoolsToShield()}`,
                    ) as string
                  }
                  onPress={onPressShieldFunds}
                  disabled={!sendGateOpen(mixnetView)}
                />
              </View>
            </View>
          )}
      </>
    );
  },
);

export default BalanceRow;
