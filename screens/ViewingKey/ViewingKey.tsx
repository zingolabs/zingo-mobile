/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { RouteEnum, SnackbarDurationEnum } from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import {
  enactGateAnswer,
  resolveTriggerGate,
} from '@app/services/gateController';
import { getRecoveryWalletInfo } from '@app/services/recoveryWalletInfo';
import { showConfirm } from '@app/services/showConfirm';
import { fetchWallet } from '@app/walletBackend';
import { copySensitive } from '@app/utils/sensitiveClipboard';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { BanIcon } from '@ui/primitives/Icons/BanIcon';
import { UsersIcon } from '@ui/primitives/Icons/UsersIcon';
import CircularReveal from '@ui/widgets/CircularReveal';
import CardExpand from '@ui/widgets/CardExpand';
import { CopyShowButtons } from '@screens/SeedBackup/components/SeedParts';
import { SIDE } from '@screens/SeedBackup/components/StepParts';
import KeyCard from './components/KeyCard';

type ViewingKeyProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.ViewingKey
> & {
  // Moves the wallet to the chosen server on another network.
  onConfirm: () => Promise<void>;
  // Runs when the user backs out of that move.
  onCancel: () => Promise<void>;
};

const QR = 196;
const TILE_BG = '#0A1B33';
const PUSH_IN_MS = 380;
const PUSH_OUT_MS = 320;

// Moves the screen in from the right and back out, for the menu entry.
const Slide: React.FunctionComponent<{
  open: boolean;
  onClosed: () => void;
  children: React.ReactNode;
}> = ({ open, onClosed, children }) => {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const x = useSharedValue(width);
  useEffect(() => {
    x.value = withTiming(
      open ? 0 : width,
      {
        duration: open ? PUSH_IN_MS : PUSH_OUT_MS,
        easing: ease.emphasized,
        reduceMotion: ReduceMotion.System,
      },
      finished => {
        if (finished && !open) {
          runOnJS(onClosed)();
        }
      },
    );
  }, [open, width, x, onClosed]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.bgCanvas },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// The wallet's viewing key: a QR and its ends, hidden until Show. With
// `switchTo`, the last look at it before the wallet moves to a server on
// that network.
const ViewingKey: React.FunctionComponent<ViewingKeyProps> = ({
  navigation,
  route,
  onConfirm,
  onCancel,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, biometrics, addLastSnackbar } = context;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { entry, switchTo } = route.params;
  const net = switchTo
    ? (translate(`settings.value-chainname-${switchTo}`) as string)
    : '';

  const [open, setOpen] = useState(true);
  const [key, setKey] = useState('');
  const [hidden, setHidden] = useState(true);
  const [unlocked, setUnlocked] = useState(!biometrics);

  useEffect(() => {
    (async () => {
      const stored = await getRecoveryWalletInfo();
      setKey(stored.ufvk || (await fetchWallet(true))?.ufvk || '');
    })();
  }, []);

  const gone = useCallback(() => navigation.goBack(), [navigation]);
  const close = useCallback(async () => {
    if (switchTo) {
      await onCancel();
    }
    setOpen(false);
  }, [switchTo, onCancel]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const confirmSwitch = () =>
    showConfirm({
      title: translate('walletseed.confirm-title') as string,
      message: translate('viewingkey.switch-warning') as string,
      buttons: [
        {
          text: translate('confirm') as string,
          onPress: async () => {
            await onConfirm();
            setOpen(false);
          },
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });

  // The key starts hidden; showing or copying it passes the device gate once.
  const unlock = async (): Promise<boolean> => {
    if (unlocked) {
      return true;
    }
    const answer = await resolveTriggerGate(undefined, biometrics, {
      translate,
    });
    const proceed = enactGateAnswer(
      answer,
      { lock: () => {}, notice: m => addLastSnackbar(m) },
      translate,
    );
    setUnlocked(proceed);
    return proceed;
  };

  const toggle = async () => {
    if (hidden && !(await unlock())) {
      return;
    }
    setHidden(h => !h);
  };

  const copy = async () => {
    if (!(await unlock())) {
      return;
    }
    copySensitive(key, () => {});
    addLastSnackbar(
      translate('walletseed.vk-copied') as string,
      SnackbarDurationEnum.short,
    );
  };

  const rows = [
    { id: 'read', Icon: EyeIcon },
    { id: 'spend', Icon: BanIcon },
    { id: 'share', Icon: UsersIcon },
  ];

  const page = (
    <View testID="viewingkey" style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <Pressable
        testID="viewingkey.close"
        accessibilityRole="button"
        accessibilityLabel={translate('seedbackup.close') as string}
        onPress={close}
        style={({ pressed }) => ({
          position: 'absolute',
          top: insets.top + 4,
          right: SIDE - 14,
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : undefined,
        })}
      >
        <XIcon size={18} color={colors.fgMuted} strokeWidth={1.8} />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.fgDefault,
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginTop: 6,
          marginHorizontal: 60,
        }}
      >
        {switchTo
          ? (translate('viewingkey.switch-title') as string).replace(
              '{net}',
              net,
            )
          : (translate('viewingkey.title') as string)}
      </Text>
      <Text
        style={{
          color: colors.fgMuted,
          fontSize: 14,
          lineHeight: 20,
          textAlign: 'center',
          marginTop: 12,
          marginHorizontal: SIDE,
        }}
      >
        {switchTo
          ? (translate('viewingkey.switch-sub') as string).replace('{net}', net)
          : (translate('viewingkey.sub') as string)}
      </Text>

      <View style={{ marginTop: 22 }}>
        <KeyCard testID="viewingkey" value={key} hidden={hidden} qrSize={QR} />
      </View>

      <View style={{ marginTop: 14 }}>
        <CopyShowButtons
          testID="viewingkey"
          hidden={hidden}
          onToggleHide={toggle}
          onCopy={copy}
        />
      </View>

      <View style={{ marginTop: 18, marginHorizontal: SIDE, gap: 12 }}>
        {rows.map(({ id, Icon }) => (
          <View
            key={id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                backgroundColor: TILE_BG,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={16} color={colors.fgViewOnly} strokeWidth={1.9} />
            </View>
            <Text
              style={{
                flex: 1,
                color: colors.fgDefault,
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {translate(`viewingkey.${id}`) as string}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        testID="viewingkey.done"
        accessibilityRole="button"
        disabled={!!switchTo && !key}
        onPress={switchTo ? confirmSwitch : close}
        style={({ pressed }) => ({
          position: 'absolute',
          left: 52,
          right: 52,
          bottom: insets.bottom + 24,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgAccent,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Text
          style={{ color: colors.bgCanvas, fontSize: 15, fontWeight: '700' }}
        >
          {
            translate(
              switchTo ? 'viewingkey.switch' : 'seedbackup.done',
            ) as string
          }
        </Text>
      </Pressable>
    </View>
  );

  if (entry.kind === 'circle') {
    return (
      <CircularReveal origin={entry.origin} open={open} onClosed={gone}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.bgCanvas },
          ]}
        >
          {page}
        </View>
      </CircularReveal>
    );
  }
  if (entry.kind === 'card') {
    return (
      <CardExpand from={entry.from} open={open} onClosed={gone}>
        {page}
      </CardExpand>
    );
  }
  return (
    <Slide open={open} onClosed={gone}>
      {page}
    </Slide>
  );
};

export default ViewingKey;
