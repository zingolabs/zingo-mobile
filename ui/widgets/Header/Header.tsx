/* eslint-disable react-native/no-inline-styles */
import { SnowflakeIcon } from '@ui/primitives/Icons/SnowflakeIcon';
import { REVEAL_OPEN_MS } from '@ui/widgets/CircularReveal';
import { ease } from '@app/theme/motion';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { useTheme, iconSize, slopFor } from '@app/theme';
import React, { useContext, useEffect, useRef } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
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
  Route,
  SnackbarDurationEnum,
  TranslateType,
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
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';

type HeaderProps = {
  // general
  testID?: string;
  title: string;
  // side menu
  noDrawMenu?: boolean;
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
  // History shows the price card in its notice stack
  noPriceRow?: boolean;
};

const Header: React.FunctionComponent<HeaderProps> = ({
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
  receivedLegend,
  setShieldingAmount,
  closeScreen,
  noUfvkIcon,
  showMessagesIcon,
  onUsdRowLayout,
  onPriceRowLayout,
  noPriceRow,
}) => {
  const navigation = useNavigation<WalletNavigation>();
  const route = useRoute();
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
    server,
    mixnetView,
    sendPermitNow,
    seedBackedUp,
    setScrollToTop,
    setScrollToBottom,
  } = context;

  const translate = translateProp ?? context.translate;
  const netInfo = netInfoProp ?? context.netInfo;
  const privacy = privacyProp !== undefined ? privacyProp : context.privacy;

  const { colors } = useTheme();

  const {
    isOpen: optionsPanelOpen,
    toggle: toggleOptionsPanel,
    open: openOptionsPanel,
  } = useOptionsPanel();
  const homeTab =
    route.name === Route.History ||
    route.name === Route.Send ||
    route.name === Route.Receive ||
    route.name === Route.Swap;
  // The panel lives in the home: from a pushed screen the button pops back
  // to it and shows the panel there.
  const toggleMenuDrawer = () => {
    if (homeTab) {
      toggleOptionsPanel();
      return;
    }
    navigation.dispatch(StackActions.popToTop());
    openOptionsPanel();
  };
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
    server,
    somePending,
    totalBalance,
    shieldingAmount,
    translate,
    addLastSnackbar,
    setBackgroundError,
    setScrollToTop,
    setScrollToBottom,
    sendPermitNow,
  });

  // The viewing key opens as a circle out of the snowflake, which turns 60°
  // on the same curve and duration.
  const snowflake = useRef<View>(null);
  const snowTurn = useSharedValue(0);
  const snowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${snowTurn.value}deg` }],
  }));
  const ufvkShowModal = () => {
    snowTurn.value = 0;
    snowTurn.value = withTiming(60, {
      duration: REVEAL_OPEN_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
    snowflake.current?.measureInWindow((x, y, width, height) =>
      navigation.navigate(Route.ViewingKey, {
        entry: {
          kind: 'circle',
          origin: { x: x + width / 2, y: y + height / 2 },
        },
      }),
    );
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
            server={server}
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
            server={server}
            showShieldButton={showShieldButton}
            shieldingFee={shieldingFee}
            valueTransfersTotal={valueTransfersTotal}
            calculateAmountToShield={calculateAmountToShield}
            calculatePoolsToShield={calculatePoolsToShield}
            calculateDisableButtonToShield={calculateDisableButtonToShield}
            onPressShieldFunds={onPressShieldFunds}
            receivedLegend={receivedLegend}
            mixnetView={mixnetView}
            onUsdRowLayout={onUsdRowLayout}
          />

          {!noBalance && !noPriceRow && (
            <PriceRow
              translate={translate}
              zecPrice={zecPrice}
              info={info}
              server={server}
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
                hitSlop={slopFor(24)}
                testID="header.drawmenu"
                accessible={true}
                accessibilityLabel={translate('menudrawer-acc') as string}
                onPress={toggleMenuDrawer}
              >
                <MenuMorphIcon />
                {!readOnly && !seedBackedUp && (
                  <View
                    testID="header.menudot"
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: -1,
                      right: -2,
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      borderWidth: 2,
                      borderColor: colors.bgCanvas,
                      backgroundColor: colors.fgWarning,
                      boxSizing: 'content-box',
                    }}
                  />
                )}
              </TouchableOpacity>
            )}
            {readOnly && !noUfvkIcon && (
              <Animated.View style={headerAnimatedStyle}>
                <TouchableOpacity
                  hitSlop={slopFor(24)}
                  testID="header.snowflake"
                  accessibilityRole="button"
                  accessibilityLabel={translate('viewingkey.title') as string}
                  onPress={ufvkShowModal}
                >
                  <Animated.View ref={snowflake} style={snowStyle}>
                    <SnowflakeIcon size={iconSize} color={colors.fgViewOnly} />
                  </Animated.View>
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
          {!noDrawMenu && showMessagesIcon ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              {/* Level with the menu icon opposite: that one centres at 28.5
                  from the top (16 of padding, half of its 25 box), this
                  corner pads 13, so an 11 half-box lands at 24 without the
                  4.5 below. The nudge rides on the icon alone, leaving the
                  logo this corner falls back to where it already sat. */}
              <TouchableOpacity
                hitSlop={slopFor(24)}
                style={{ marginRight: 5, marginTop: 4.5 }}
                testID="header.messages"
                onPress={() => navigation.navigate(Route.Messages)}
              >
                <MessagesIcon size={iconSize} color={colors.fgMuted} />
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
              <TouchableOpacity hitSlop={slopFor(24)} onPress={closeScreen}>
                <ChevronLeft
                  style={{ marginHorizontal: 10 }}
                  size={24}
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
