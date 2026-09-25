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
import BoldText from '@ui/primitives/BoldText';
import SyncStatusBar from './components/SyncStatusBar';
import BalanceRow from './components/BalanceRow';
import PriceRow from './components/PriceRow';
import { MessagesIcon } from '@ui/primitives/Icons/MessagesIcon';
import { MenuMorphIcon } from '@ui/widgets/MenuMorphIcon';

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
    zecPrice,
    readOnly,
    valueTransfersTotal,
    somePending,
    shieldingAmount,
    selectServer,
    mixnetView,
  } = context;

  const translate = translateProp ?? context.translate;
  const netInfo = netInfoProp ?? context.netInfo;
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
            percentageOutputsScanned={percentageOutputsScanned}
            syncInProgress={syncInProgress}
            viewSyncStatus={viewSyncStatus}
            opacityValue={opacityValue}
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
            noPrivacy={noPrivacy}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar}
            privacy={privacy}
            translate={translate}
            totalBalance={totalBalance}
            info={info}
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
                <TouchableOpacity onPress={ufvkShowModal}>
                  <FontAwesomeIcon
                    icon={faSnowflake}
                    size={20}
                    color={colors.fgMuted}
                  />
                </TouchableOpacity>
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
          {/* Settings used to sit here too; it now lives in the Options
              panel's header, its single door. With only messages left,
              the corner falls back to the logo when there is nothing to
              show. */}
          {!noDrawMenu &&
          screenName !== ScreenEnum.Settings &&
          showMessagesIcon ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              {/* Level with the menu icon opposite: that one centres at 28.5
                  from the top (16 of padding, half of its 25 box), this
                  corner pads 13, so an 11 half-box lands at 24 without the
                  4.5 below. The nudge rides on the icon alone, leaving the
                  logo this corner falls back to where it already sat. */}
              <TouchableOpacity
                style={{ marginRight: 5, marginTop: 4.5 }}
                testID="header.messages"
                onPress={() => navigation.navigate(RouteEnum.Messages)}
              >
                <MessagesIcon size={22} color="#B1BBC5" />
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
