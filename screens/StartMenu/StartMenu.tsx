/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import {
  chipMinHeight,
  iconSizeSm,
  radiusPill,
  space4,
  space8,
  space12,
  space16,
  space20,
  space24,
  useTheme,
} from '@app/theme';

import { ContextAppLoading } from '@app/context';
import { WalletType } from '@app/AppState';
import { getZingoName, getZingoVersion } from '@app/utils/ZingoAppData';
import { formatInteger } from '@app/utils/formatAmount';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Card from '@ui/widgets/Card';
import Tag from '@ui/widgets/Tag';
import ServerIcon from '@ui/widgets/ServerIcon';
import { duration, ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { WifiIcon } from '@ui/primitives/Icons/WifiIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';

// Vertical positions from the 402 x 874 design, as fractions of the height.
const TITLE_TOP = 294 / 874;
const CARD_TOP = 422 / 874;
const BOTTOM_MARGIN = 60;
const BACK_ONLINE_MS = duration.fresh;
// Exception E, the brand: the wordmark, used once, not text.
const BRAND_SIZE = 49;
const BRAND_LINE = 59;

// The launch sequence, about 1.1 s: "Welcome to" rises, "Zingo" settles,
// the tagline fades, the actions arrive last.
const LAUNCH_MS = duration.hero;
const titleEnter = () =>
  FadeInUp.duration(500)
    .delay(250)
    .easing(ease.out)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
    .reduceMotion(ReduceMotion.System);
const brandEnter = () =>
  FadeInUp.duration(650)
    .delay(370)
    .easing(ease.out)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: 14 }, { scale: 0.97 }],
    })
    .reduceMotion(ReduceMotion.System);
const tagEnter = () =>
  FadeIn.duration(450).delay(600).reduceMotion(ReduceMotion.System);
const actionsEnter = () =>
  FadeInUp.duration(480)
    .delay(740)
    .easing(ease.out)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
    .reduceMotion(ReduceMotion.System);
// Going offline after the launch: the pill and the line fade in at once.
const offlineEnter = () =>
  FadeIn.duration(duration.tabFade).reduceMotion(ReduceMotion.System);
const offlineExit = () =>
  FadeOut.duration(duration.tabFade).reduceMotion(ReduceMotion.System);
const pillExit = () =>
  FadeOut.duration(duration.axis).reduceMotion(ReduceMotion.System);
// Back online, only the pill's icon and text change.
const pillSwap = () =>
  FadeIn.duration(duration.base).reduceMotion(ReduceMotion.System);

type StartMenuProps = {
  actionButtonsDisabled: boolean;
  recoveryWallet: WalletType | null;
  // The saved phrase outlived an uninstall: only then is it "from a previous install".
  freshInstall: boolean;
  importRecoveryWallet: () => void;
  viewRecoveryWallet: () => void;
  customServer: () => void;
  walletExists: boolean;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
};

const StartMenu: React.FunctionComponent<StartMenuProps> = ({
  actionButtonsDisabled,
  recoveryWallet,
  freshInstall,
  importRecoveryWallet,
  viewRecoveryWallet,
  customServer,
  walletExists,
  openCurrentWallet,
  createNewWallet,
  getwalletToRestore,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, translate, server } = context;
  const { colors } = useTheme();

  const [containerH, setContainerH] = useState<number>(0);
  const [cardH, setCardH] = useState<number>(0);
  const [actionsH, setActionsH] = useState<number>(0);
  const [backOnline, setBackOnline] = useState<boolean>(false);
  const [started, setStarted] = useState<string | null>(null);
  const wasOffline = useRef<boolean>(!netInfo.isConnected);
  // Past the launch sequence, what appears no longer waits for it.
  const launched = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      launched.current = true;
    }, LAUNCH_MS);
    return () => clearTimeout(t);
  }, []);
  const lateEnter = () => (launched.current ? offlineEnter() : tagEnter());

  useEffect(() => {
    if (netInfo.isConnected && wasOffline.current) {
      setBackOnline(true);
      const t = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
      wasOffline.current = false;
      return () => clearTimeout(t);
    }
    if (!netInfo.isConnected) {
      wasOffline.current = true;
      setBackOnline(false);
    }
  }, [netInfo.isConnected]);

  /**
   * On a short screen, or with large text, the card at its design height
   * runs into the actions at the bottom: it rises to sit above them, and the
   * title rises with it.
   */
  const cardTop = containerH * CARD_TOP;
  const lift =
    recoveryWallet && cardH > 0 && actionsH > 0
      ? Math.max(
          0,
          cardTop + cardH + space16 - (containerH - BOTTOM_MARGIN - actionsH),
        )
      : 0;

  const offline = server.kind === 'offline';
  const noInternet = !netInfo.isConnected;
  const canAct = netInfo.isConnected || offline;
  const nonMain = server.chainName !== 'main';
  const netLabel =
    server.chainName === 'test'
      ? (translate('loadingapp.net-testnet') as string)
      : server.chainName === 'regtest'
        ? (translate('loadingapp.net-regtest') as string)
        : '';

  const link = (
    title: string,
    onPress: () => void,
    testID: string,
    small = false,
  ) => (
    <Button
      testID={testID}
      variant="text"
      inline
      size={small ? 'small' : undefined}
      disabled={actionButtonsDisabled}
      title={title}
      onPress={onPress}
    />
  );

  // Only the button that started the work collapses into its spinner; the
  // other one stays as it is and ignores presses until the work ends.
  const press = (testID: string, onPress: () => void) => () => {
    if (actionButtonsDisabled) {
      return;
    }
    setStarted(testID);
    onPress();
  };
  const busyFor = (testID: string) =>
    actionButtonsDisabled && started === testID;

  const pill = (title: string, onPress: () => void, testID: string) => (
    <View style={{ alignSelf: 'stretch' }}>
      <Button
        variant="primary"
        testID={testID}
        title={title}
        busy={busyFor(testID)}
        onPress={press(testID, onPress)}
      />
    </View>
  );

  const chip = (label: string, ok: boolean, icon?: React.ReactNode) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space8,
        minHeight: chipMinHeight,
        paddingHorizontal: space12,
        borderRadius: radiusPill,
        borderWidth: 1,
        borderColor: ok ? colors.borderAccent : colors.bottomSheetBorder,
        backgroundColor: ok ? colors.bgAccentSubtle : colors.bgSurface,
      }}
    >
      {icon}
      <Text variant="caption" style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );

  return (
    <View
      style={{ flex: 1 }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <Animated.View
        entering={tagEnter()}
        style={{
          position: 'absolute',
          top: 0,
          right: space20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space8,
        }}
      >
        {!!netLabel && <Tag tone="warning">{netLabel}</Tag>}
        <Pressable
          kind="icon"
          testID="loadingapp.server"
          onPress={customServer}
          disabled={actionButtonsDisabled}
          hitSlop={8}
          accessibilityRole="button"
        >
          <ServerIcon noInternet={noInternet} offline={offline} />
        </Pressable>
      </Animated.View>

      {(noInternet || backOnline) && (
        <Animated.View
          entering={lateEnter()}
          exiting={pillExit()}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: space4,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Animated.View
            key={backOnline ? 'online' : 'offline'}
            entering={pillSwap()}
          >
            {backOnline
              ? chip(
                  translate('loadingapp.back-online') as string,
                  true,
                  <CheckIcon size={iconSizeSm} color={colors.fgAccent} />,
                )
              : chip(
                  translate('loadingapp.no-internet') as string,
                  false,
                  <WifiIcon size={iconSizeSm} color={colors.fgDanger} />,
                )}
          </Animated.View>
        </Animated.View>
      )}

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: Math.max(0, containerH * TITLE_TOP - lift),
          alignItems: 'center',
        }}
      >
        <Animated.View entering={titleEnter()}>
          <Text variant="balance" style={{ fontWeight: '400' }}>
            {translate('loadingapp.welcome') as string}
          </Text>
        </Animated.View>
        <Animated.View entering={brandEnter()} style={{ marginTop: space8 }}>
          <Text
            variant="balance"
            style={{
              fontWeight: '400',
              fontSize: BRAND_SIZE,
              lineHeight: BRAND_LINE,
            }}
          >
            {getZingoName()}
          </Text>
        </Animated.View>
        <Animated.View
          entering={tagEnter()}
          style={{ marginTop: space20, paddingHorizontal: space20 }}
        >
          <Text
            variant="bodySmall"
            tone="muted"
            style={{ textAlign: 'center' }}
          >
            {translate('loadingapp.tagline') as string}
          </Text>
        </Animated.View>
        {noInternet && !recoveryWallet && (
          <Animated.View
            entering={lateEnter()}
            exiting={offlineExit()}
            style={{ marginTop: space8, paddingHorizontal: space24 }}
          >
            <Text
              variant="caption"
              tone="muted"
              style={{ textAlign: 'center' }}
            >
              {translate('loadingapp.offline-line') as string}
            </Text>
          </Animated.View>
        )}
      </View>

      {recoveryWallet && (
        <Animated.View
          entering={tagEnter()}
          onLayout={e => setCardH(e.nativeEvent.layout.height)}
          style={{
            position: 'absolute',
            left: space24,
            right: space24,
            top: cardTop - lift,
          }}
        >
          <Card>
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space8,
                }}
              >
                <TriangleAlert size={iconSizeSm} color={colors.fgDefault} />
                <Text variant="bodyStrong">
                  {
                    translate(
                      freshInstall
                        ? 'loadingapp.previous-install-title'
                        : 'loadingapp.saved-wallet-title',
                    ) as string
                  }
                </Text>
              </View>
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: space4 }}
              >
                {translate('loadingapp.previous-install-body') as string}
              </Text>
            </View>
            <Text variant="caption">
              {`${
                translate(
                  recoveryWallet.seed
                    ? 'loadingapp.card-words'
                    : 'loadingapp.card-key',
                ) as string
              } · ${(translate('loadingapp.card-birthday') as string).replace(
                '{height}',
                formatInteger(recoveryWallet.birthday),
              )}`}
            </Text>
            <View>
              <Button
                variant="primary"
                size="small"
                testID="loadingapp.importthis"
                title={translate('loadingapp.import-this') as string}
                busy={busyFor('loadingapp.importthis')}
                onPress={press('loadingapp.importthis', importRecoveryWallet)}
              />
            </View>
            <View style={{ alignItems: 'center' }}>
              {link(
                translate('loadingapp.view-seed') as string,
                viewRecoveryWallet,
                'loadingapp.viewseed',
                true,
              )}
            </View>
          </Card>
        </Animated.View>
      )}

      <Animated.View
        entering={actionsEnter()}
        onLayout={e => setActionsH(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: BOTTOM_MARGIN,
          alignItems: 'center',
          paddingHorizontal: space20,
        }}
      >
        {nonMain && server.kind === 'remote' && (
          <View style={{ marginBottom: space16 }}>
            {chip(
              (translate('loadingapp.connected-to') as string).replace(
                '{host}',
                server.uri.replace(/^https?:\/\//, ''),
              ),
              false,
            )}
          </View>
        )}
        {canAct &&
          link(
            translate('import.screen-title') as string,
            getwalletToRestore,
            'loadingapp.restorewalletseedufvk',
          )}
        {canAct && walletExists && (
          <View style={{ marginTop: space4 }}>
            {link(
              translate('loadingapp.createnewwallet') as string,
              createNewWallet,
              'loadingapp.createnewwallet',
            )}
          </View>
        )}
        <View style={{ marginTop: space24, alignSelf: 'stretch' }}>
          {walletExists
            ? pill(
                translate('loadingapp.opencurrentwallet') as string,
                openCurrentWallet,
                'loadingapp.opencurrentwallet',
              )
            : canAct &&
              pill(
                translate('loadingapp.createnewwallet') as string,
                createNewWallet,
                'loadingapp.createnewwallet',
              )}
        </View>
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: space16, textAlign: 'center' }}
        >
          {getZingoVersion()}
        </Text>
      </Animated.View>
    </View>
  );
};

export default StartMenu;
