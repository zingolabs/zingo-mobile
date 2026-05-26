/* eslint-disable react-native/no-inline-styles */
import {
  faBars,
  faChevronLeft,
  faGear,
  faSnowflake,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import React, { useContext } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import {
  ModeEnum,
  NetInfoType,
  RouteEnum,
  ScreenEnum,
  SnackbarDurationEnum,
  TranslateType,
  UfvkActionEnum,
} from '../../app/AppState';
import { ContextAppLoaded } from '../../app/context';
import { ThemeType } from '../../app/types';
import simpleBiometrics from '../../app/simpleBiometrics';
import { getZingoLogo } from '../../app/utils/ZingoAppData';
import { useShieldFunds } from '../../app/hooks/useShieldFunds';
import { useSyncStatus } from '../../app/hooks/useSyncStatus';
import BoldText from '../Components/BoldText';
import SyncStatusBar from './components/SyncStatusBar';
import BalanceRow from './components/BalanceRow';

type HeaderProps = {
  // general
  testID?: string;
  title: string;
  screenName: ScreenEnum;
  // side menu
  noDrawMenu?: boolean;
  toggleMenuDrawer?: () => void;
  closeScreen?: () => void;
  // balance
  noBalance?: boolean;
  // syncing icons
  noSyncingStatus?: boolean;
  // ufvk
  noUfvkIcon?: boolean;
  // privacy
  noPrivacy?: boolean;
  setPrivacyOption?: (value: boolean) => Promise<void>;
  addLastSnackbar?: (message: string, duration?: SnackbarDurationEnum) => void;
  // shielding
  setShieldingAmount?: (value: number) => void;
  setScrollToTop?: (value: boolean) => void;
  setScrollToBottom?: (value: boolean) => void;
  // seed screen - shared between AppLoading & AppLoaded - different contexts
  translate?: (key: string) => TranslateType;
  netInfo?: NetInfoType;
  mode?: ModeEnum;
  privacy?: boolean;
  // store the error if the App is in background
  setBackgroundError?: (title: string, error: string) => void;
  // first funds received legend for the Seed screen
  receivedLegend?: boolean;
};

const Header: React.FunctionComponent<HeaderProps> = ({
  toggleMenuDrawer,
  title,
  noBalance,
  noSyncingStatus,
  noDrawMenu,
  testID,
  translate: translateProp,
  netInfo: netInfoProp,
  mode: modeProp,
  privacy: privacyProp,
  setBackgroundError,
  noPrivacy,
  setPrivacyOption,
  addLastSnackbar,
  screenName,
  receivedLegend,
  setShieldingAmount,
  setScrollToTop,
  setScrollToBottom,
  closeScreen,
  noUfvkIcon,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    totalBalance,
    info,
    syncingStatus,
    currency,
    zecPrice,
    readOnly,
    valueTransfersTotal,
    somePending,
    security,
    shieldingAmount,
    selectServer,
    setZecPrice,
    backgroundSyncInfo,
    nym,
  } = context;

  const translate = translateProp ?? context.translate;
  const netInfo = netInfoProp ?? context.netInfo;
  const mode = modeProp ?? context.mode;
  const privacy = privacyProp !== undefined ? privacyProp : context.privacy;

  const { colors } = useTheme() as ThemeType;

  const {
    percentageOutputsScanned,
    syncInProgress,
    viewSyncStatus,
    opacityValue,
  } = useSyncStatus({ syncingStatus, noSyncingStatus });

  const {
    showShieldButton,
    shieldingFee,
    onPressShieldFunds,
    calculateAmountToShield,
    calculatePoolsToShield,
    calculateDisableButtonToShield,
  } = useShieldFunds({
    readOnly,
    setShieldingAmount,
    selectServer,
    somePending,
    totalBalance,
    shieldingAmount,
    translate,
    netInfo,
    addLastSnackbar,
    setBackgroundError,
    setScrollToTop,
    setScrollToBottom,
  });

  const ufvkShowModal = async () => {
    const resultBio = security.seedUfvkScreen
      ? await simpleBiometrics({ translate })
      : true;
    if (resultBio === false) {
      addLastSnackbar?.(translate('biometrics-error') as string);
    } else {
      navigation.navigate(RouteEnum.Ufvk, {
        action: UfvkActionEnum.view,
      });
    }
  };

  return (
    <>
      <View>
        <View
          testID="header"
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingBottom: 0,
            backgroundColor: colors.card,
            paddingTop: 10,
            minHeight: !noDrawMenu ? 60 : 25,
          }}
        >
          <SyncStatusBar
            noSyncingStatus={noSyncingStatus}
            selectServer={selectServer}
            netInfo={netInfo}
            mode={mode}
            percentageOutputsScanned={percentageOutputsScanned}
            syncInProgress={syncInProgress}
            viewSyncStatus={viewSyncStatus}
            opacityValue={opacityValue}
            nym={nym}
            backgroundSyncInfo={backgroundSyncInfo}
            translate={translate}
            privacy={privacy}
            noPrivacy={noPrivacy}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar}
            noBalance={noBalance}
          />

          <BalanceRow
            noBalance={noBalance}
            mode={mode}
            noPrivacy={noPrivacy}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar}
            privacy={privacy}
            translate={translate}
            totalBalance={totalBalance}
            info={info}
            currency={currency}
            zecPrice={zecPrice}
            setZecPrice={setZecPrice}
            selectServer={selectServer}
            showShieldButton={showShieldButton}
            shieldingFee={shieldingFee}
            valueTransfersTotal={valueTransfersTotal}
            calculateAmountToShield={calculateAmountToShield}
            calculatePoolsToShield={calculatePoolsToShield}
            calculateDisableButtonToShield={calculateDisableButtonToShield}
            onPressShieldFunds={onPressShieldFunds}
            receivedLegend={receivedLegend}
          />
        </View>

        <View
          style={{
            padding: 11.5,
            position: 'absolute',
            left: 0,
          }}
        >
          <View
            style={{ alignItems: 'center', flexDirection: 'row', height: 40 }}
          >
            {!noDrawMenu && (
              <TouchableOpacity
                style={{ marginRight: 5 }}
                testID="header.drawmenu"
                accessible={true}
                accessibilityLabel={translate('menudrawer-acc') as string}
                onPress={toggleMenuDrawer}
              >
                <FontAwesomeIcon
                  icon={faBars}
                  size={32}
                  color={colors.border}
                />
              </TouchableOpacity>
            )}
            {readOnly && !noUfvkIcon && (
              <>
                {!(
                  mode === ModeEnum.basic &&
                  valueTransfersTotal !== null &&
                  valueTransfersTotal <= 0
                ) &&
                !(
                  mode === ModeEnum.basic &&
                  totalBalance &&
                  totalBalance.totalOrchardBalance +
                    totalBalance.totalSaplingBalance <=
                    0
                ) ? (
                  <TouchableOpacity onPress={ufvkShowModal}>
                    <FontAwesomeIcon
                      icon={faSnowflake}
                      size={20}
                      color={colors.zingo}
                    />
                  </TouchableOpacity>
                ) : (
                  <FontAwesomeIcon
                    icon={faSnowflake}
                    size={20}
                    color={colors.zingo}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <View
          style={{
            padding: 13,
            position: 'absolute',
            right: 0,
          }}
        >
          {!noDrawMenu && screenName !== ScreenEnum.Settings ? (
            <>
              <TouchableOpacity
                style={{ marginRight: 5 }}
                testID="header.settings"
                onPress={async () => {
                  const resultBio = security.settingsScreen
                    ? await simpleBiometrics({ translate })
                    : true;
                  if (resultBio === false) {
                    addLastSnackbar?.(translate('biometrics-error') as string);
                  } else {
                    navigation.navigate(RouteEnum.Settings);
                  }
                }}
              >
                <FontAwesomeIcon
                  icon={faGear}
                  size={28}
                  color={colors.border}
                />
              </TouchableOpacity>
            </>
          ) : (
            <Image
              source={getZingoLogo()}
              style={{
                width: 38,
                height: 38,
                resizeMode: 'contain',
                borderRadius: 8,
              }}
            />
          )}
        </View>
      </View>

      <View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            width: '100%',
            marginVertical: 5,
          }}
        >
          {closeScreen ? (
            <>
              <TouchableOpacity onPress={closeScreen}>
                <FontAwesomeIcon
                  style={{ marginHorizontal: 10 }}
                  size={24}
                  icon={faChevronLeft}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <BoldText
                testID={testID}
                style={{
                  color: colors.money,
                  fontSize: 18,
                  paddingHorizontal: 5,
                }}
              >
                {title}
              </BoldText>
              <View style={{ width: 30, height: 30, marginHorizontal: 10 }} />
            </>
          ) : (
            <>
              <View style={{ width: 30, height: 30, marginHorizontal: 10 }} />
              <BoldText
                testID={testID}
                style={{
                  color: colors.money,
                  fontSize: 18,
                  paddingHorizontal: 5,
                  textAlign: 'center',
                }}
              >
                {title}
              </BoldText>
              <View style={{ width: 30, height: 30, marginHorizontal: 10 }} />
            </>
          )}
        </View>

        <View
          style={{ width: '100%', height: 1, backgroundColor: colors.primary }}
        />
      </View>
    </>
  );
};

export default Header;
