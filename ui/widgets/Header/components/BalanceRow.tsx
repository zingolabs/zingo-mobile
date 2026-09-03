/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  ChainNameEnum,
  CurrencyEnum,
  ModeEnum,
  RouteEnum,
  SelectServerEnum,
  SnackbarDurationEnum,
  TranslateType,
} from '@app/AppState';
import TotalBalanceClass from '@app/AppState/classes/TotalBalanceClass';
import InfoType from '@app/AppState/types/InfoType';
import ZecPriceType from '@app/AppState/types/ZecPriceType';
import Utils from '@app/utils';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import CurrencyAmount from '@ui/widgets/CurrencyAmount';
import FadeText from '@ui/primitives/FadeText';
import PriceFetcher from '@ui/widgets/PriceFetcher';
import RegText from '@ui/primitives/RegText';
import ZecAmount from '@ui/widgets/ZecAmount';
import PrivacyToggle from './PrivacyToggle';

type BalanceRowProps = {
  noBalance: boolean | undefined;
  mode: ModeEnum;
  noPrivacy: boolean | undefined;
  setPrivacyOption: ((value: boolean) => Promise<void>) | undefined;
  addLastSnackbar:
    ((msg: string, duration?: SnackbarDurationEnum) => void) | undefined;
  privacy: boolean;
  translate: (key: string) => TranslateType;
  totalBalance: TotalBalanceClass | null;
  info: InfoType;
  currency: CurrencyEnum;
  zecPrice: ZecPriceType;
  selectServer: SelectServerEnum;
  showShieldButton: boolean;
  shieldingFee: number;
  valueTransfersTotal: number | null;
  calculateAmountToShield: () => string;
  calculatePoolsToShield: () => string;
  calculateDisableButtonToShield: () => boolean;
  onPressShieldFunds: () => void;
  receivedLegend: boolean | undefined;
  onUsdRowLayout?: (height: number) => void;
};

const BalanceRow: React.FC<BalanceRowProps> = React.memo(
  ({
    noBalance,
    mode,
    noPrivacy,
    setPrivacyOption,
    addLastSnackbar,
    privacy,
    translate,
    totalBalance,
    info,
    currency,
    zecPrice,
    selectServer,
    showShieldButton,
    shieldingFee,
    valueTransfersTotal,
    calculateAmountToShield,
    calculatePoolsToShield,
    calculateDisableButtonToShield,
    onPressShieldFunds,
    receivedLegend,
    onUsdRowLayout,
  }) => {
    const navigation = useNavigation<NavigationProp<ParamListBase>>();
    const { colors } = useTheme();

    return (
      <>
        {!noBalance && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 10,
            }}
          >
            {mode !== ModeEnum.basic &&
              !noPrivacy &&
              setPrivacyOption &&
              addLastSnackbar && (
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
                totalBalance
                  ? totalBalance.totalIronwoodBalance +
                    totalBalance.totalOrchardBalance +
                    totalBalance.totalSaplingBalance +
                    totalBalance.totalTransparentBalance
                  : 0
              }
              privacy={privacy}
              smallPrefix={true}
            />
            {mode !== ModeEnum.basic &&
              totalBalance &&
              (totalBalance.totalOrchardBalance !==
                totalBalance.confirmedOrchardBalance ||
                totalBalance.totalIronwoodBalance > 0 ||
                totalBalance.totalSaplingBalance > 0 ||
                totalBalance.totalTransparentBalance > 0) && (
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
          totalBalance &&
          totalBalance.totalIronwoodBalance +
            totalBalance.totalOrchardBalance +
            totalBalance.totalSaplingBalance >
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
                  totalBalance.totalIronwoodBalance +
                  totalBalance.totalOrchardBalance +
                  totalBalance.totalSaplingBalance
                }
                privacy={privacy}
              />
              <RegText color={colors.fgAccent}>!!!</RegText>
            </View>
          )}

        {currency === CurrencyEnum.USDCurrency &&
          !noBalance &&
          selectServer !== SelectServerEnum.offline &&
          info.chainName === ChainNameEnum.mainChainName && (
            <View
              onLayout={e => onUsdRowLayout?.(e.nativeEvent.layout.height)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <CurrencyAmount
                style={{ marginTop: 0, marginBottom: 0 }}
                priceDate={zecPrice.date}
                price={zecPrice.zecPrice}
                amtZec={
                  totalBalance
                    ? totalBalance.totalIronwoodBalance +
                      totalBalance.totalOrchardBalance +
                      totalBalance.totalSaplingBalance +
                      totalBalance.totalTransparentBalance
                    : 0
                }
                currency={currency}
                privacy={privacy}
              />
              <View style={{ marginLeft: 5 }}>
                <PriceFetcher />
              </View>
            </View>
          )}

        {showShieldButton &&
          !noBalance &&
          !calculateDisableButtonToShield() &&
          valueTransfersTotal !== null && (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
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
                  disabled={calculateDisableButtonToShield()}
                />
              </View>
            </View>
          )}
      </>
    );
  },
);

export default BalanceRow;
