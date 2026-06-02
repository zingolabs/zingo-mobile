/* eslint-disable react-native/no-inline-styles */
import { faChevronLeft, faSnowflake } from '@fortawesome/free-solid-svg-icons';
import BurgerIcon from '../../assets/img/options/burger.svg';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import React, { useContext, useEffect } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useOptionsPanel } from '../../app/context/optionsPanel';

// Mirror the panel host's fade duration so the header dissolves in lockstep
// with the panel that's appearing over it.
const HEADER_FADE_MS = 320;
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
import { MessagesIcon } from '../Components/Icons/MessagesIcon';
import { MessagesIcon as BoltIcon } from '../Components/Icons/BoltIcon';

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
  // show messages icon next to settings
  showMessagesIcon?: boolean;
  // optional layout reporting (used by History for bottom-sheet snap points)
  onUsdRowLayout?: (height: number) => void;
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
  showMessagesIcon,
  onUsdRowLayout,
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

  // Fade the entire screen header out when the Options panel is open so
  // its content doesn't shine through the (fading-in) panel overlay.
  const { isOpen: optionsPanelOpen } = useOptionsPanel();
  const headerOpacity = useSharedValue(1);
  useEffect(() => {
    headerOpacity.value = withTiming(optionsPanelOpen ? 0 : 1, {
      duration: HEADER_FADE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [optionsPanelOpen, headerOpacity]);
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

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
      <Animated.View style={headerAnimatedStyle}>
        <View
          testID="header"
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: colors.card,
            paddingTop: 0,
            paddingBottom: 10,
            minHeight: 50,
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
            onUsdRowLayout={onUsdRowLayout}
          />
        </View>

        <View
          style={{
            paddingLeft: 20,
            paddingTop: 16,
            paddingRight: 11.5,
            paddingBottom: 11.5,
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row' }}>
            {!noDrawMenu && (
              <TouchableOpacity
                style={{ marginRight: 5 }}
                testID="header.drawmenu"
                accessible={true}
                accessibilityLabel={translate('menudrawer-acc') as string}
                onPress={toggleMenuDrawer}
              >
                <BurgerIcon width={19} height={17} />
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
            top: 0,
          }}
        >
          {!noDrawMenu && screenName !== ScreenEnum.Settings ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              {showMessagesIcon && (
                <TouchableOpacity
                  testID="header.messages"
                  onPress={() => navigation.navigate(RouteEnum.Messages)}
                >
                  <MessagesIcon size={26} color={colors.border} />
                </TouchableOpacity>
              )}
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
                <BoltIcon size={28} color={colors.border} />
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={getZingoLogo()}
              style={{
                width: 30,
                height: 30,
                resizeMode: 'contain',
                borderRadius: 6,
              }}
            />
          )}
        </View>
      </Animated.View>

      {!!title && (
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
      )}
    </>
  );
};

export default Header;
