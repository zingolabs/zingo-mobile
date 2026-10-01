/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  ReduceMotion,
} from 'react-native-reanimated';
import { showConfirm } from '@app/services/showConfirm';
import { useTheme } from '@app/theme';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { BottomSheetModal } from '@gorhom/bottom-sheet';
import ActionMenuBottomSheet, {
  ActionMenuBottomSheetAction,
} from '@ui/widgets/ActionMenuBottomSheet';

import { ContextAppLoading } from '@app/context';
import { getZingoName, getZingoVersion } from '@app/utils/ZingoAppData';
import RegText from '@ui/primitives/RegText';
import BusyButton from '@ui/widgets/BusyButton';
import { ease } from '@app/theme/motion';

// Vertical positions from the 402 x 874 design, as fractions of the height.
const TITLE_TOP = 294 / 874;
const BOTTOM_MARGIN = 60;
const PILL_WIDTH = 270;

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

type StartMenuProps = {
  actionButtonsDisabled: boolean;
  hasRecoveryWalletInfoSaved: boolean;
  recoverRecoveryWalletInfo: () => void;
  customServer: () => void;
  walletExists: boolean;
  hasBackupWallet: boolean;
  openCurrentWallet: () => void;
  createNewWallet: () => void;
  getwalletToRestore: () => void;
  restoreLastBackup: () => void;
};

const StartMenu: React.FunctionComponent<StartMenuProps> = ({
  actionButtonsDisabled,
  hasRecoveryWalletInfoSaved,
  recoverRecoveryWalletInfo,
  customServer,
  walletExists,
  hasBackupWallet,
  openCurrentWallet,
  createNewWallet,
  getwalletToRestore,
  restoreLastBackup,
}) => {
  const context = useContext(ContextAppLoading);
  const { netInfo, translate, server } = context;
  const { colors } = useTheme();

  const [containerH, setContainerH] = useState<number>(0);
  const optionsMenuRef = useRef<BottomSheetModal>(null);

  // Consolidates the three legacy ContextMenu kebabs into one action list
  // gated by network + saved-state. Order: recoverkeys → custom server →
  // restore backup.
  const optionsActions = useMemo<ActionMenuBottomSheetAction[]>(() => {
    if (actionButtonsDisabled) {
      return [];
    }
    const list: ActionMenuBottomSheetAction[] = [];
    if (hasRecoveryWalletInfoSaved) {
      list.push({
        label: translate('loadingapp.recoverkeys') as string,
        onPress: recoverRecoveryWalletInfo,
      });
    }
    if (netInfo.isConnected) {
      list.push({
        label: translate('loadingapp.custom') as string,
        onPress: () => customServer(),
      });
      if (hasBackupWallet) {
        list.push({
          label: translate('loadedapp.restorebackupwallet') as string,
          onPress: () =>
            showConfirm({
              title: translate('loadedapp.restorebackupwallet') as string,
              message: translate(
                'loadedapp.alert-restorebackupwallet-body',
              ) as string,
              buttons: [
                {
                  text: translate('confirm') as string,
                  onPress: () => restoreLastBackup(),
                },
                { text: translate('cancel') as string, style: 'cancel' },
              ],
            }),
        });
      }
    }
    return list;
  }, [
    actionButtonsDisabled,
    hasRecoveryWalletInfoSaved,
    netInfo.isConnected,
    hasBackupWallet,
    translate,
    recoverRecoveryWalletInfo,
    customServer,
    restoreLastBackup,
  ]);

  const canAct = netInfo.isConnected || server.kind === 'offline';
  const chainLabel = translate(
    `settings.value-chainname-${server.chainName}`,
  ) as string;
  const serverLine =
    server.kind === 'remote'
      ? `[${chainLabel}] ${server.uri}`
      : server.kind === 'offline'
        ? `[${chainLabel}] ${translate('settings.server-offline') as string}`
        : '';
  const warning = !netInfo.isConnected
    ? (translate('report.nointernet') as string)
    : netInfo.type === NetInfoStateType.cellular
      ? (translate('report.cellulardata') as string)
      : netInfo.isConnectionExpensive
        ? (translate('report.connectionexpensive') as string)
        : '';
  const note = walletExists
    ? (translate('loadingapp.noopenwallet-message') as string)
    : !netInfo.isConnected
      ? (translate('loadingapp.nointernet-message') as string)
      : server.kind === 'offline'
        ? (translate('loadingapp.offline-message') as string)
        : '';

  const onCreate = () => {
    if (walletExists) {
      showConfirm({
        title: translate('loadingapp.alert-newwallet-title') as string,
        message: translate('loadingapp.alert-newwallet-body') as string,
        buttons: [
          {
            text: translate('confirm') as string,
            style: 'destructive',
            onPress: () => createNewWallet(),
          },
          { text: translate('cancel') as string, style: 'cancel' },
        ],
      });
    } else {
      createNewWallet();
    }
  };

  const link = (title: string, onPress: () => void, testID: string) => (
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
          fontSize: 16,
          fontWeight: '500',
        }}
      >
        {title}
      </RegText>
    </Pressable>
  );

  const pill = (title: string, onPress: () => void, testID: string) => (
    <View style={{ width: PILL_WIDTH }}>
      <BusyButton
        testID={testID}
        title={title}
        labelSize={16}
        enabled={true}
        busy={actionButtonsDisabled}
        onPress={onPress}
        onDisabledPress={() => {}}
      />
    </View>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: 'transparent' }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      {optionsActions.length > 0 && (
        <Pressable
          onPress={() => optionsMenuRef.current?.present()}
          hitSlop={8}
          style={{
            position: 'absolute',
            top: 37,
            right: 20,
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesomeIcon
            icon={faEllipsisV}
            color={colors.fgMuted}
            size={22}
          />
        </Pressable>
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
      </View>

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
        {!!note && (
          <RegText
            style={{
              color: colors.fgAccentDisabled,
              fontSize: 12,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {note}
          </RegText>
        )}
        {!!warning && (
          <RegText
            style={{
              color: colors.fgWarning,
              fontSize: 12,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {warning}
          </RegText>
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
              onCreate,
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
                onCreate,
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
          {serverLine
            ? `${getZingoVersion()} · ${serverLine}`
            : getZingoVersion()}
        </RegText>
      </Animated.View>

      <ActionMenuBottomSheet
        ref={optionsMenuRef}
        title={translate('loadedapp.options') as string}
        actions={optionsActions}
      />
    </View>
  );
};

export default StartMenu;
