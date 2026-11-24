/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';

import {
  iconSizeSm,
  radiusMd,
  radiusPill,
  space12,
  space4,
  space8,
  useTheme,
} from '@app/theme';
import { useUnfold } from '@app/hooks/useUnfold';
import { ContextAppLoaded } from '@app/context';
import { Route, SelectServerEnum, SnackbarDurationEnum } from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import { navigateWallet } from '@app/navigation/navigate';
import { sendEmail } from '@app/services/sendEmail';
import { registerServerHealthListener } from '@app/services/showServerHealth';
import {
  MeasuredServer,
  defaultServer,
  healthyCandidate,
  measureServers,
} from '@app/services/serverPicking';
import { hostOf } from '@screens/Server/useCustomServer';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Button from '@ui/primitives/Button';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import Card from '@ui/widgets/Card';
import Tag from '@ui/widgets/Tag';
import TitleBar from '@ui/widgets/TitleBar';
import { ChevronDown, ChevronUp } from '@ui/primitives/Icons/Chevron';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { MailIcon } from '@ui/primitives/Icons/MailIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';

type Offer =
  | { kind: 'measuring' }
  | { kind: 'none' }
  | { kind: 'server'; server: MeasuredServer };

const Unfolding = ({ children }: { children: React.ReactNode }) => {
  const unfold = useUnfold();
  return (
    <Animated.View style={[{ alignSelf: 'stretch' }, unfold]}>
      {children}
    </Animated.View>
  );
};

/**
 * What is wrong with the open wallet's server, and the ways off it: the
 * best other server measured on opening, or the Server screen.
 */
const ServerHealthSheet: React.FC = () => {
  const ref = useRef<BottomSheetModal>(null);
  const { colors } = useTheme();
  const {
    translate,
    serverHealth,
    selectServer,
    walletChainName,
    netInfo,
    zingolibVersion,
    addLastSnackbar,
    switchServerFromHealth,
  } = useContext(ContextAppLoaded);
  const t = (key: string) => translate(key) as string;
  const [offer, setOffer] = useState<Offer>({ kind: 'measuring' });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  const measure = useCallback(async () => {
    const mine = ++run.current;
    setOffer({ kind: 'measuring' });
    const measured = await measureServers(
      translate,
      walletChainName,
      !!netInfo.isConnected,
    );
    if (mine !== run.current) {
      return;
    }
    const pick = healthyCandidate(
      measured,
      serverHealth.uri,
      defaultServer(translate, walletChainName)?.uri ?? null,
      serverHealth.height,
    );
    setOffer(pick ? { kind: 'server', server: pick } : { kind: 'none' });
  }, [
    translate,
    walletChainName,
    netInfo.isConnected,
    serverHealth.uri,
    serverHealth.height,
  ]);

  useEffect(
    () =>
      registerServerHealthListener(() => {
        setOpen(false);
        ref.current?.present();
        measure();
      }),
    [measure],
  );

  const dismiss = () => {
    run.current++;
    ref.current?.dismiss();
  };

  const host = hostOf(serverHealth.uri);
  const level = serverHealth.level;
  const tone = level === 'slow' ? 'warning' : 'danger';
  const detail = serverHealth.lastError || `${serverHealth.uri}: ${level}`;
  const Chevron = open ? ChevronUp : ChevronDown;

  const switchTo = async (server: MeasuredServer) => {
    setBusy(true);
    const moved = await switchServerFromHealth(
      remoteServer(server.uri, server.chainName),
    );
    setBusy(false);
    if (moved) {
      dismiss();
    }
  };

  const chooseOther = () => {
    dismiss();
    setTimeout(() => navigateWallet({ screen: Route.Server }), 0);
  };

  return (
    <AppSheetModal
      ref={ref}
      onDismiss={() => run.current++}
      header={
        <TitleBar
          title={t('server-health.title')}
          right={{
            icon: XIcon,
            accessibilityLabel: t('close'),
            onPress: dismiss,
            testID: 'server-health.close',
          }}
        />
      }
      contentStyle={{ paddingHorizontal: 20 }}
    >
      <Card testID="server-health.card">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space8,
              flexShrink: 1,
            }}
          >
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: radiusPill,
                backgroundColor:
                  tone === 'warning' ? colors.fgWarning : colors.fgDanger,
              }}
            />
            <Text
              variant="bodyStrong"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {host}
            </Text>
          </View>
          <Tag tone={tone}>{t(`server-health.${level}`)}</Tag>
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: space4 }}>
          {`${t(
            selectServer === SelectServerEnum.auto
              ? 'server.automatic'
              : 'server-health.manual',
          )} · ${t(`server-health.${level}-sub`)}`}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: space8,
          }}
        >
          <Pressable
            kind="link"
            testID="server-health.details"
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen(v => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: space4,
              minHeight: 36,
            }}
          >
            <Text variant="caption" tone="muted">
              {t('server-health.details')}
            </Text>
            <Chevron size={iconSizeSm} color={colors.fgMuted} />
          </Pressable>
          <Button
            testID="server-health.send"
            variant="text"
            icon={MailIcon}
            title={t('server-health.send')}
            onPress={() =>
              sendEmail(
                translate,
                zingolibVersion,
                t('server-health.send-subject'),
                detail,
              )
            }
          />
        </View>
        {open && (
          <Unfolding>
            <View
              style={{
                paddingVertical: space12,
                paddingLeft: 14,
                paddingRight: 44,
                borderRadius: radiusMd,
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
              }}
            >
              <Text testID="server-health.detail" variant="address" selectable>
                {detail}
              </Text>
              <Pressable
                kind="icon"
                testID="server-health.copy"
                accessibilityRole="button"
                accessibilityLabel={t('copy')}
                onPress={() => {
                  Clipboard.setString(detail);
                  addLastSnackbar(t('txtcopied'), SnackbarDurationEnum.short);
                }}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: 4,
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CopyIcon size={iconSizeSm} color={colors.fgMuted} />
              </Pressable>
            </View>
          </Unfolding>
        )}
      </Card>
      {offer.kind === 'none' && (
        <Text
          testID="server-health.none"
          variant="caption"
          tone="muted"
          style={{ marginTop: space12, paddingHorizontal: space4 }}
        >
          {t('server-health.none')}
        </Text>
      )}
      <View style={{ marginTop: 20, gap: 10 }}>
        {offer.kind !== 'none' && (
          <Button
            testID="server-health.switch"
            variant="primary"
            busy={offer.kind === 'measuring' || busy}
            title={
              offer.kind === 'server'
                ? t('server-health.switch')
                    .replace('{host}', hostOf(offer.server.uri))
                    .replace('{ms}', String(offer.server.latency))
                : t('server-health.measuring')
            }
            onPress={() => offer.kind === 'server' && switchTo(offer.server)}
          />
        )}
        <Button
          testID="server-health.other"
          variant={offer.kind === 'none' ? 'primary' : 'text'}
          disabled={busy}
          title={t('server-health.other')}
          onPress={chooseOther}
        />
      </View>
    </AppSheetModal>
  );
};

export default React.memo(ServerHealthSheet);
