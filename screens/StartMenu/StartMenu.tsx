/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { useTheme } from '@app/theme';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCheck,
  faDatabase,
  faTriangleExclamation,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';

import { ContextAppLoading } from '@app/context';
import { WalletType } from '@app/AppState';
import { getZingoName, getZingoVersion } from '@app/utils/ZingoAppData';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import BusyButton from '@ui/widgets/BusyButton';
import { duration, ease } from '@app/theme/motion';

// Vertical positions from the 402 x 874 design, as fractions of the height.
const TITLE_TOP = 294 / 874;
const CARD_TOP = 422 / 874;
const BOTTOM_MARGIN = 60;
const PILL_WIDTH = 270;
const BACK_ONLINE_MS = 1600;

const titleEnter = () =>
  FadeInUp.duration(400)
    .delay(500)
    .easing(ease.out)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
    .reduceMotion(ReduceMotion.System);
const brandEnter = () =>
  FadeIn.duration(420)
    .delay(620)
    .easing(ease.out)
    .withInitialValues({ opacity: 0, transform: [{ scale: 1.03 }] })
    .reduceMotion(ReduceMotion.System);
const tagEnter = () =>
  FadeIn.duration(300).delay(780).reduceMotion(ReduceMotion.System);
const actionsEnter = () =>
  FadeInUp.duration(360)
    .delay(900)
    .easing(ease.out)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
    .reduceMotion(ReduceMotion.System);
const pillEnter = () =>
  FadeIn.duration(duration.emphasized).reduceMotion(ReduceMotion.System);
const pillExit = () => FadeOut.duration(300).reduceMotion(ReduceMotion.System);

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
  const [backOnline, setBackOnline] = useState<boolean>(false);
  const [started, setStarted] = useState<string | null>(null);
  const wasOffline = useRef<boolean>(!netInfo.isConnected);

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

  const offline = server.kind === 'offline';
  const noInternet = !netInfo.isConnected;
  const canAct = netInfo.isConnected || offline;
  const nonMain = server.chainName !== 'main';
  const dotColor = noInternet
    ? colors.fgDangerEmphasis
    : offline
      ? colors.fgMuted
      : colors.fgAccent;
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
    size = 16,
  ) => (
    <Pressable
      testID={testID}
      disabled={actionButtonsDisabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        paddingHorizontal: 10,
        paddingVertical: 4,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <RegText
        style={{
          color: actionButtonsDisabled
            ? colors.fgAccentDisabled
            : colors.fgAccent,
          fontSize: size,
          fontWeight: size < 16 ? '700' : '500',
        }}
      >
        {title}
      </RegText>
    </Pressable>
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
    <View style={{ width: PILL_WIDTH }}>
      <BusyButton
        testID={testID}
        title={title}
        labelSize={16}
        enabled={true}
        busy={busyFor(testID)}
        onPress={press(testID, onPress)}
        onDisabledPress={() => {}}
      />
    </View>
  );

  const chip = (label: string, ok: boolean, icon?: React.ReactNode) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 30,
        paddingHorizontal: 14,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: ok ? colors.borderAccent : colors.bottomSheetBorder,
        backgroundColor: ok ? colors.bgSecondaryDisabled : colors.bgSurface,
      }}
    >
      {icon}
      <RegText style={{ fontSize: 11.5, fontWeight: '500' }}>{label}</RegText>
    </View>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: 'transparent' }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <Animated.View
        entering={tagEnter()}
        style={{
          position: 'absolute',
          top: 37,
          right: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {!!netLabel && (
          <View
            style={{
              height: 23,
              paddingHorizontal: 11,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.borderWarning,
              backgroundColor: colors.bgWarning,
              justifyContent: 'center',
            }}
          >
            <RegText
              style={{
                fontSize: 11.5,
                fontWeight: '600',
                color: colors.fgWarningEmphasis,
              }}
            >
              {netLabel}
            </RegText>
          </View>
        )}
        <Pressable
          testID="loadingapp.server"
          onPress={customServer}
          disabled={actionButtonsDisabled}
          hitSlop={8}
          accessibilityRole="button"
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesomeIcon icon={faDatabase} color={colors.fgMuted} size={22} />
          <View
            style={{
              position: 'absolute',
              right: 2,
              bottom: 3,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dotColor,
              borderWidth: 2,
              borderColor: colors.bgCanvas,
            }}
          />
        </Pressable>
      </Animated.View>

      {(noInternet || backOnline) && (
        <Animated.View
          key={backOnline ? 'online' : 'offline'}
          entering={pillEnter()}
          exiting={pillExit()}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 42,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          {backOnline
            ? chip(
                translate('loadingapp.back-online') as string,
                true,
                <FontAwesomeIcon
                  icon={faCheck}
                  size={12}
                  color={colors.fgAccent}
                />,
              )
            : chip(
                translate('loadingapp.no-internet') as string,
                false,
                <FontAwesomeIcon
                  icon={faWifi}
                  size={12}
                  color={colors.fgDangerEmphasis}
                />,
              )}
        </Animated.View>
      )}

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: containerH * TITLE_TOP,
          alignItems: 'center',
        }}
      >
        <Animated.Text
          entering={titleEnter()}
          style={{ color: colors.fgDefault, fontSize: 35 }}
        >
          {translate('loadingapp.welcome') as string}
        </Animated.Text>
        <Animated.Text
          entering={brandEnter()}
          style={{
            color: colors.fgDefault,
            fontSize: 49,
            letterSpacing: -0.2,
            marginTop: 10,
          }}
        >
          {getZingoName()}
        </Animated.Text>
        <Animated.Text
          entering={tagEnter()}
          style={{
            color: colors.fgMuted,
            fontSize: 13.5,
            marginTop: 20,
            textAlign: 'center',
            paddingHorizontal: 32,
          }}
        >
          {translate('loadingapp.tagline') as string}
        </Animated.Text>
        {noInternet && !recoveryWallet && (
          <Animated.Text
            entering={tagEnter()}
            style={{
              color: colors.fgMuted,
              fontSize: 10,
              lineHeight: 15,
              marginTop: 10,
              textAlign: 'center',
              paddingHorizontal: 46,
            }}
          >
            {translate('loadingapp.offline-line') as string}
          </Animated.Text>
        )}
      </View>

      {recoveryWallet && (
        <Animated.View
          entering={tagEnter()}
          style={{
            position: 'absolute',
            left: 46,
            right: 46,
            top: containerH * CARD_TOP,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgSurface,
            paddingHorizontal: 15,
            paddingTop: 13,
            paddingBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              size={11}
              color={colors.fgDefault}
            />
            <BoldText style={{ fontSize: 11, lineHeight: 16 }}>
              {
                translate(
                  freshInstall
                    ? 'loadingapp.previous-install-title'
                    : 'loadingapp.saved-wallet-title',
                ) as string
              }
            </BoldText>
          </View>
          <RegText
            style={{
              marginTop: 6,
              fontSize: 10.5,
              lineHeight: 14,
              color: colors.fgMuted,
            }}
          >
            {translate('loadingapp.previous-install-body') as string}
          </RegText>
          <RegText style={{ marginTop: 9, fontSize: 10.5, lineHeight: 16 }}>
            {`${
              translate(
                recoveryWallet.seed
                  ? 'loadingapp.card-words'
                  : 'loadingapp.card-key',
              ) as string
            }  ·  ${(translate('loadingapp.card-birthday') as string).replace(
              '{height}',
              recoveryWallet.birthday.toLocaleString(),
            )}`}
          </RegText>
          <View style={{ marginTop: 12 }}>
            <BusyButton
              testID="loadingapp.importthis"
              title={translate('loadingapp.import-this') as string}
              labelSize={11}
              height={30}
              enabled={true}
              busy={busyFor('loadingapp.importthis')}
              onPress={press('loadingapp.importthis', importRecoveryWallet)}
              onDisabledPress={() => {}}
            />
          </View>
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            {link(
              translate('loadingapp.view-seed') as string,
              viewRecoveryWallet,
              'loadingapp.viewseed',
              10.5,
            )}
          </View>
        </Animated.View>
      )}

      <Animated.View
        entering={actionsEnter()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: BOTTOM_MARGIN,
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        {nonMain && server.kind === 'remote' && (
          <View style={{ marginBottom: 18 }}>
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
          <View style={{ marginTop: 6 }}>
            {link(
              translate('loadingapp.createnewwallet') as string,
              createNewWallet,
              'loadingapp.createnewwallet',
            )}
          </View>
        )}
        <View style={{ marginTop: 27 }}>
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
        <RegText
          style={{
            color: colors.fgMuted,
            fontSize: 11,
            marginTop: 18,
            textAlign: 'center',
          }}
        >
          {getZingoVersion()}
        </RegText>
      </Animated.View>
    </View>
  );
};

export default StartMenu;
