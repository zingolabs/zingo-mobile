/* eslint-disable react-native/no-inline-styles */
import { faChevronLeft, faSnowflake } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import React, { useContext, useEffect } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useOptionsPanel } from '@app/context/optionsPanel';

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
} from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { getZingoLogo } from '@app/utils/ZingoAppData';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import { useSyncStatus } from '@app/hooks/useSyncStatus';
import BoldText from '../../primitives/BoldText';
import SyncStatusBar from './components/SyncStatusBar';
import BalanceRow from './components/BalanceRow';
import PriceRow from './components/PriceRow';
import { MessagesIcon } from '../../primitives/Icons/MessagesIcon';
import { MessagesIcon as BoltIcon } from '../../primitives/Icons/BoltIcon';
import { MenuMorphIcon } from '../../primitives/Icons/MenuMorphIcon';

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
  // optional layout reporting for the pull-down PriceRow snap point
  onPriceRowLayout?: (height: number) => void;
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
  onPriceRowLayout,
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
    shieldingAmount,
    selectServer,
    nym,
    mixnetView,
  } = context;

  const translate = translateProp ?? context.translate;
  const netInfo = netInfoProp ?? context.netInfo;
  const mode = modeProp ?? context.mode;
  const privacy = privacyProp !== undefined ? privacyProp : context.privacy;

  const { colors } = useTheme();

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

  // Audit Issue D — bio gate for seedUfvkScreen lives at the Ufvk screen
  // entry (components/Ufvk/ShowUfvk.tsx). Caller only navigates.
  const ufvkShowModal = () => {
    navigation.navigate(RouteEnum.Ufvk, {
      action: UfvkActionEnum.view,
    });
  };

  return (
    <>
      <View>
        <Animated.View
          testID="header"
          style={[
            headerAnimatedStyle,
            {
              display: 'flex',
              alignItems: 'center',
              backgroundColor: colors.bgCanvas,
              paddingTop: 0,
              paddingBottom: 10,
              minHeight: 50,
            },
          ]}
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
            mixnetView={mixnetView}
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

          {!noBalance && (
            <PriceRow
              translate={translate}
              currency={currency}
              zecPrice={zecPrice}
              info={info}
              selectServer={selectServer}
              onLayout={onPriceRowLayout}
            />
          )}
        </Animated.View>

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
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
            {!noDrawMenu && (
              <TouchableOpacity
                testID="header.drawmenu"
                accessible={true}
                accessibilityLabel={translate('menudrawer-acc') as string}
                onPress={toggleMenuDrawer}
              >
                <MenuMorphIcon />
              </TouchableOpacity>
            )}
            {readOnly && !noUfvkIcon && (
              <Animated.View style={headerAnimatedStyle}>
                {!(
                  mode === ModeEnum.basic &&
                  valueTransfersTotal !== null &&
                  valueTransfersTotal <= 0
                ) &&
                !(
                  mode === ModeEnum.basic &&
                  totalBalance &&
                  totalBalance.totalIronwoodBalance +
                    totalBalance.totalOrchardBalance +
                    totalBalance.totalSaplingBalance <=
                    0
                ) ? (
                  <TouchableOpacity onPress={ufvkShowModal}>
                    <FontAwesomeIcon
                      icon={faSnowflake}
                      size={20}
                      color={colors.fgMuted}
                    />
                  </TouchableOpacity>
                ) : (
                  <FontAwesomeIcon
                    icon={faSnowflake}
                    size={20}
                    color={colors.fgMuted}
                  />
                )}
              </Animated.View>
            )}
          </View>
        </View>

        <Animated.View
          style={[
            headerAnimatedStyle,
            {
              padding: 13,
              position: 'absolute',
              right: 0,
              top: 0,
            },
          ]}
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
                  <MessagesIcon size={24} color="#B1BBC5" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ marginRight: 5 }}
                testID="header.settings"
                onPress={() => {
                  // Bio gate for settingsScreen lives at the Settings
                  // screen entry (components/Settings/Settings.tsx).
                  navigation.navigate(RouteEnum.Settings);
                }}
              >
                <BoltIcon size={25} color="#B1BBC5" />
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
        </Animated.View>
      </View>

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
                  color={colors.fgAccent}
                />
              </TouchableOpacity>
              <BoldText
                testID={testID}
                style={{
                  color: colors.fgDefault,
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
                  color: colors.fgDefault,
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
