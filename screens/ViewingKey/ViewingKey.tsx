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
import KeyQr from './components/KeyQr';

type ViewingKeyProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.ViewingKey
>;

const QR = 196;
const HEAD = 12;
const TAIL = 8;
const TILE_BG = '#0A1B33';
const PUSH_IN_MS = 380;
const PUSH_OUT_MS = 320;

const masked = (key: string) => `${key.slice(0, 6)}••••••…••••••••`;
const truncated = (key: string) =>
  key.length > HEAD + TAIL ? `${key.slice(0, HEAD)}…${key.slice(-TAIL)}` : key;

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

// The wallet's viewing key: a QR and its ends, hidden until Show.
const ViewingKey: React.FunctionComponent<ViewingKeyProps> = ({
  navigation,
  route,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, biometrics, addLastSnackbar } = context;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entry = route.params.entry;

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

  const close = () => setOpen(false);
  const gone = useCallback(() => navigation.goBack(), [navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, []);

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
        {translate('viewingkey.title') as string}
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
        {translate('viewingkey.sub') as string}
      </Text>

      <View
        style={{
          alignItems: 'center',
          marginTop: 22,
          marginHorizontal: SIDE,
          paddingVertical: 18,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          backgroundColor: colors.bgSurface,
        }}
      >
        {!!key && <KeyQr value={key} size={QR} hidden={hidden} />}
        <Text
          style={{
            color: colors.fgMuted,
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 0.6,
            marginTop: 14,
          }}
        >
          {translate('viewingkey.label') as string}
        </Text>
        <Text
          testID="viewingkey.key"
          selectable={false}
          style={{
            color: colors.fgDefault,
            fontSize: 14,
            fontWeight: '700',
            marginTop: 4,
          }}
        >
          {key ? (hidden ? masked(key) : truncated(key)) : ''}
        </Text>
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
        onPress={close}
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
          {translate('seedbackup.done') as string}
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
