/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  BackHandler,
  ScrollView,
  StyleSheet,
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
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';

import {
  useTheme,
  iconSizeMd,
  radiusSm,
  space8,
  space12,
  space16,
  space24,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import { duration } from '@app/theme/motion';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { SnackbarDurationEnum } from '@app/AppState';
import Header from '@ui/widgets/Header';
import { AppDrawerParamList } from '@app/types';
import {
  enactGateAnswer,
  resolveTriggerGate,
} from '@app/services/gateController';
import { getRecoveryWalletInfo } from '@app/services/recoveryWalletInfo';
import { showConfirm } from '@app/services/showConfirm';
import { fetchWallet } from '@app/walletBackend';
import { copySensitive } from '@app/utils/sensitiveClipboard';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { BanIcon } from '@ui/primitives/Icons/BanIcon';
import { UsersIcon } from '@ui/primitives/Icons/UsersIcon';
import CircularReveal from '@ui/widgets/CircularReveal';
import CardExpand from '@ui/widgets/CardExpand';
import { CopyShowButtons } from '@screens/SeedBackup/components/SeedParts';
import { SIDE } from '@screens/SeedBackup/components/StepParts';
import KeyCard from './components/KeyCard';
import Button from '@ui/primitives/Button';
import { themeTokens } from '@app/theme';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';
import { useCompact } from '@app/hooks/useCompact';

const QR = 196;
const TILE_BG = themeTokens.bgViewOnlySubtle;
const PUSH_IN_MS = duration.screen;
const PUSH_OUT_MS = duration.emphasized;

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
type ViewingKeyProps = NativeStackScreenProps<AppDrawerParamList, 'ViewingKey'>;

const ViewingKey: React.FunctionComponent<ViewingKeyProps> = ({
  navigation,
  route,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    biometrics,
    addLastSnackbar,
    applyPendingServer: onConfirm,
    cancelPendingServer: onCancel,
  } = context;
  const { colors } = useTheme();
  const { edges, fades } = useScrollEdges();
  const { gap } = useCompact();
  const bottomPad = useBottomActionPad();
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
    <View testID="viewingkey" style={{ flex: 1, paddingTop: 4 }}>
      <Header
        title={
          switchTo
            ? (translate('viewingkey.switch-title') as string).replace(
                '{net}',
                net,
              )
            : (translate('viewingkey.title') as string)
        }
        closeScreen={close}
        backTestID="viewingkey.back"
        backAccessibilityLabel={translate('walletseed.back-acc') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />
      {/** The content scrolls above the footer, never under it. */}
      <ScrollView
        {...edges}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: space16 }}
      >
        <Text
          variant="body"
          tone="muted"
          style={{ textAlign: 'center', marginHorizontal: SIDE }}
        >
          {switchTo
            ? (translate('viewingkey.switch-sub') as string).replace(
                '{net}',
                net,
              )
            : (translate('viewingkey.sub') as string)}
        </Text>

        <View style={{ marginTop: gap(space24) }}>
          <KeyCard
            testID="viewingkey"
            value={key}
            hidden={hidden}
            qrSize={QR}
          />
        </View>

        <View style={{ marginTop: space12 }}>
          <CopyShowButtons
            testID="viewingkey"
            hidden={hidden}
            onToggleHide={toggle}
            onCopy={copy}
          />
        </View>

        <View
          style={{ marginTop: space16, marginHorizontal: SIDE, gap: space12 }}
        >
          {rows.map(({ id, Icon }) => (
            <View
              key={id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radiusSm,
                  backgroundColor: TILE_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={iconSizeMd} color={colors.fgViewOnly} />
              </View>
              <Text variant="bodySmall" style={{ flex: 1 }}>
                {translate(`viewingkey.${id}`) as string}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {fades}

      <View
        style={{
          marginHorizontal: SIDE,
          paddingTop: space8,
          paddingBottom: bottomPad,
        }}
      >
        <Button
          testID="viewingkey.done"
          variant="primary"
          disabled={!!switchTo && !key}
          onPress={switchTo ? confirmSwitch : close}
          title={
            translate(
              switchTo ? 'viewingkey.switch' : 'seedbackup.done',
            ) as string
          }
        />
      </View>
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
