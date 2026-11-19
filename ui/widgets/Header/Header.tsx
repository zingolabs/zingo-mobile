/* geometry-gap: DESIGN.md known gap */
/* eslint-disable react-native/no-inline-styles */
import { SnowflakeIcon } from '@ui/primitives/Icons/SnowflakeIcon';
import { REVEAL_OPEN_MS } from '@ui/widgets/CircularReveal';
import { ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { useTheme, iconSize, slopFor } from '@app/theme';
import React, { useContext, useEffect, useRef } from 'react';
import { Image, View } from 'react-native';
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
/** The bar with the wallet switcher, the mixnet and the menu: its row and the space under it. */
const BAR_ROW = 57;
const BAR_BOTTOM = 10;
/**
 * Where every panel's top edge sits, under the top bar's icons: the tabs'
 * fixed panels and the full panels opened over them, so one covers the
 * other exactly.
 */
export const PANEL_TOP = 59;

const HEADER_FADE_MS = 320;
/** The menu's box and its distance from the top; the switcher centres on it. */
const MENU_TOP = 16;
const MENU_SIDE = 25;
const SWITCHER_LEFT = 12;
import {
  NetInfoType,
  Route,
  SnackbarDurationEnum,
  TranslateType,
} from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { getZingoLogo } from '@app/utils/ZingoAppData';
import { useSyncStatus } from '@app/hooks/useSyncStatus';
import TitleBar from '@ui/widgets/TitleBar';
import SyncLine from './components/SyncLine';
import MixnetIcon from '@ui/primitives/Icons/MixnetIcon';
import { viewPhase } from '@app/walletBackend/transforms/mixnetView';
import BalanceRow from './components/BalanceRow';
import PriceRow from './components/PriceRow';
import { MenuMorphIcon } from '@ui/widgets/MenuMorphIcon';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { AvatarCategory } from '@ui/widgets/Avatar';
import { showWallets } from '@app/services/showWallets';
import WalletSwitcher, { SWITCHER_HEIGHT } from './components/WalletSwitcher';

type HeaderProps = {
  // general
  testID?: string;
  title: string;
  // side menu
  noDrawMenu?: boolean;
  closeScreen?: () => void;
  /** The back arrow does nothing for now (a server being set). */
  backDisabled?: boolean;
  /** The back arrow's testID and spoken label, with closeScreen. */
  backTestID?: string;
  backAccessibilityLabel?: string;
  /** Drawn in place of the title text: the title with its tip, say. */
  titleElement?: React.ReactElement;
  /** An action at the bar's right end. */
  right?: React.ComponentProps<typeof TitleBar>['right'];
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
  backDisabled,
  backTestID,
  backAccessibilityLabel,
  titleElement,
  right,
  noUfvkIcon,
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
    wallets,
    walletId,
    switching,
  } = context;
  /** The wallet being opened takes the switcher at once, while Home still shows the last one. */
  const shownWallet =
    switching.kind === 'opening'
      ? switching.wallet
      : wallets.find(w => w.id === walletId);

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

  const hasTitle = !!title || !!titleElement;

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
              /** A screen's title sits right under the row: 40 from the badge's centre to the title's. */
              paddingBottom: hasTitle ? 0 : BAR_BOTTOM,
              minHeight: 50,
            },
          ]}
        >
          {/* The mixnet icon alone in the middle of the bar, centred on the menu's line as the switcher is. */}
          <View
            style={{
              height: BAR_ROW,
              alignItems: 'center',
              paddingTop: MENU_TOP,
            }}
          >
            <View style={{ height: MENU_SIDE, justifyContent: 'center' }}>
              {mixnetPhase !== 'absent' && (
                <Pressable
                  kind="icon"
                  testID="header.mixnet-status"
                  hitSlop={slopFor(22)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    translate('settings.nym-diagnostics') as string
                  }
                  onPress={() => navigation.navigate(Route.MixnetDoctor)}
                >
                  <MixnetIcon phase={mixnetPhase} />
                </Pressable>
              )}
            </View>
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
              opening={
                switching.kind === 'opening' ? switching.wallet.meta.name : ''
              }
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

        {noDrawMenu ? (
          <>
            {/* A menu screen: the snowflake at the left, the logo at the right. */}
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
              <View
                style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}
              >
                {readOnly && !noUfvkIcon && (
                  <Animated.View style={headerAnimatedStyle}>
                    <Pressable
                      kind="icon"
                      hitSlop={slopFor(24)}
                      testID="header.snowflake"
                      accessibilityRole="button"
                      accessibilityLabel={
                        translate('viewingkey.title') as string
                      }
                      onPress={ufvkShowModal}
                    >
                      <Animated.View ref={snowflake} style={snowStyle}>
                        <SnowflakeIcon
                          size={iconSize}
                          color={colors.fgViewOnly}
                        />
                      </Animated.View>
                    </Pressable>
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
              <Image
                source={getZingoLogo()}
                style={{
                  width: 30,
                  height: 30,
                  resizeMode: 'contain',
                  borderRadius: 6,
                }}
              />
            </Animated.View>
          </>
        ) : (
          <>
            {/* The open wallet at the left, centred on the menu's line opposite. */}
            {!!shownWallet && (
              <Animated.View
                style={[
                  headerAnimatedStyle,
                  {
                    position: 'absolute',
                    left: SWITCHER_LEFT,
                    top: MENU_TOP + MENU_SIDE / 2 - SWITCHER_HEIGHT / 2,
                  },
                ]}
              >
                <WalletSwitcher
                  name={shownWallet.meta.name}
                  category={(shownWallet.meta.category ?? 1) as AvatarCategory}
                  accessibilityLabel={(
                    translate('wallets.switch-acc') as string
                  ).replace('{name}', shownWallet.meta.name)}
                  onPress={showWallets}
                />
              </Animated.View>
            )}

            {/* The menu at the right, with the view-only snowflake before it. */}
            <View
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                paddingRight: 20,
                paddingTop: MENU_TOP,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {readOnly && !noUfvkIcon && (
                <Animated.View style={headerAnimatedStyle}>
                  <Pressable
                    kind="icon"
                    hitSlop={slopFor(24)}
                    testID="header.snowflake"
                    accessibilityRole="button"
                    accessibilityLabel={translate('viewingkey.title') as string}
                    onPress={ufvkShowModal}
                  >
                    <Animated.View ref={snowflake} style={snowStyle}>
                      <SnowflakeIcon
                        size={iconSize}
                        color={colors.fgViewOnly}
                      />
                    </Animated.View>
                  </Pressable>
                </Animated.View>
              )}
              <Pressable
                kind="icon"
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
              </Pressable>
            </View>
          </>
        )}
      </View>

      {hasTitle && (
        <TitleBar
          tight
          testID={testID}
          title={titleElement ?? title}
          right={right}
          left={
            closeScreen
              ? {
                  icon: ChevronLeft,
                  accent: true,
                  onPress: closeScreen,
                  disabled: backDisabled,
                  testID: backTestID,
                  accessibilityLabel: backAccessibilityLabel ?? title,
                }
              : undefined
          }
        />
      )}
    </>
  );
};

export default Header;
