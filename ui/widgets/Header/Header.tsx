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
/** The bar with the menu, the mixnet and Messages: its row and the space under it. */
const BAR_ROW = 57;
const BAR_BOTTOM = 10;
/** The Header's height without the balance: where a full panel starts. */
export const HEADER_BAR_HEIGHT = BAR_ROW + BAR_BOTTOM;

const HEADER_FADE_MS = 320;
import {
  NetInfoType,
  Route,
  SnackbarDurationEnum,
  TranslateType,
} from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { getZingoLogo } from '@app/utils/ZingoAppData';
import { useSyncStatus } from '@app/hooks/useSyncStatus';
import BoldText from '@ui/primitives/BoldText';
import SyncLine from './components/SyncLine';
import MixnetIcon from '@ui/primitives/Icons/MixnetIcon';
import { viewPhase } from '@app/walletBackend/transforms/mixnetView';
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
  noPrivacy,
  setPrivacyOption,
  receivedLegend,
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
    server,
    mixnetView,
    seedBackedUp,
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

  const mixnetPhase = viewPhase(mixnetView);
  const { percentageOutputsScanned, syncInProgress } = useSyncStatus({
    syncingStatus,
    noSyncingStatus,
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
              paddingBottom: BAR_BOTTOM,
              minHeight: 50,
            },
          ]}
        >
          {/* The mixnet icon alone in the middle of the bar, level with the menu. */}
          <View
            style={{
              height: BAR_ROW,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 12,
            }}
          >
            {mixnetPhase !== 'absent' && (
              <TouchableOpacity
                testID="header.mixnet-status"
                hitSlop={slopFor(44)}
                accessibilityRole="button"
                accessibilityLabel={
                  translate('settings.nym-diagnostics') as string
                }
                onPress={() => navigation.navigate(Route.MixnetDoctor)}
              >
                <MixnetIcon phase={mixnetPhase} />
              </TouchableOpacity>
            )}
          </View>

          <BalanceRow
            noBalance={noBalance}
            noPrivacy={noPrivacy}
            setPrivacyOption={setPrivacyOption}
            privacy={privacy}
            translate={translate}
            totalBalance={totalBalance}
            info={info}
            zecPrice={zecPrice}
            server={server}
            receivedLegend={receivedLegend}
            onUsdRowLayout={onUsdRowLayout}
          />

          {!noBalance && !noSyncingStatus && (
            <SyncLine
              server={server}
              netInfo={netInfo}
              percentage={percentageOutputsScanned}
              syncInProgress={syncInProgress}
              translate={translate}
            />
          )}

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
