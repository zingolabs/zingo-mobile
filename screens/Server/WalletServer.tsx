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
import { usePreventRemove } from '@react-navigation/native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useEdgeSwipeBack } from '@app/hooks/useEdgeSwipeBack';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  ChainNameEnum,
  Route,
  SelectServerEnum,
  ServerType,
  ServerUrisType,
  SnackbarDurationEnum,
} from '@app/AppState';
import { offlineServer, remoteServer } from '@app/AppState/types/ServerType';
import { ServerStatus } from '@app/AppState/types/ServerStatus';
import { AppDrawerParamList } from '@app/types';
import { serverUris } from '@app/uris';
import {
  otherServersFor,
  pickAutomatic,
  probeUri,
  recommendedServers,
} from '@app/services/serverPicking';
import { AXIS_PT, axisEnter, axisExit } from '@ui/widgets/OnboardingStage';
import ServerList from '@screens/ServerList';
import Server from './Server';
import Header from '@ui/widgets/Header';
import SettingsFileImpl from '@app/services/SettingsFileImpl';
import {
  setAddWalletDraft,
  useAddWalletDraft,
} from '@app/services/addWalletDraft';

// The Server screen inside the wallet, for one wallet: a choice reconnects
// the open wallet, or is kept in another wallet's meta for when it opens. The
// network is the wallet's and does not change.
type WalletServerProps = NativeStackScreenProps<AppDrawerParamList, 'Server'>;

const WalletServer: React.FC<WalletServerProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const context = useContext(ContextAppLoaded);
  const {
    setServerOption,
    translate,
    netInfo,
    readOnly,
    addLastSnackbar,
    walletId,
    wallets,
    refreshWallets,
  } = context;
  /** The wallet being added, whose server lives in its draft until it exists. */
  const forDraft = !!route.params && 'draft' in route.params;
  const draft = useAddWalletDraft();
  /** The wallet this screen sets the server of; another than the open one is only stored. */
  const paramsId =
    route.params && 'walletId' in route.params ? route.params.walletId : '';
  const target = wallets.find(w => w.id === (paramsId || walletId));
  const isOpen = !forDraft && (!target || target.id === walletId);
  const [stored, setStored] = useState<{
    server: ServerType;
    selectServer: SelectServerEnum;
  } | null>(null);
  useEffect(() => {
    if (!isOpen && target) {
      SettingsFileImpl.serverOf(target.meta).then(setStored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, target?.id]);
  const server = forDraft
    ? draft.server
    : isOpen
      ? context.server
      : (stored?.server ?? context.server);
  const selectServer = forDraft
    ? draft.selectServer
    : isOpen
      ? context.selectServer
      : (stored?.selectServer ?? context.selectServer);
  const walletChainName = forDraft
    ? draft.keyChain.kind === 'key'
      ? draft.keyChain.chain
      : draft.server.chainName
    : isOpen
      ? context.walletChainName
      : ((target?.meta.chain as ChainNameEnum) ?? context.walletChainName);
  /** A wallet's network never changes; one being added picks it, unless its viewing key set it. */
  const networkLocked = !forDraft || draft.keyChain.kind === 'key';
  const online = !!netInfo.isConnected;
  const [status, setStatus] = useState<ServerStatus>('wait');
  const [blockHeight, setBlockHeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [latencies, setLatencies] = useState<Record<string, number | null>>({});
  const [lists, setLists] = useState<Record<string, ServerUrisType[]>>({});
  const [other, setOther] = useState<ChainNameEnum | null>(null);
  const backGuard = useRef<(() => boolean) | null>(null);
  const [guarded, setGuarded] = useState(false);
  /**
   * 'back': the user leaves, and the effect below goes once the render that
   * lowers the guard has landed (a discarded server is still dirty before it).
   * 'away': a chain change took over the navigation.
   */
  const [leaving, setLeaving] = useState<'none' | 'back' | 'away'>('none');
  const mounted = useRef(true);
  const known = useRef(new Set<string>());
  // The first page shows without a transition; the stack push moves it.
  const moved = useRef(false);
  useEffect(() => {
    moved.current = true;
  }, [other]);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const probeCurrent = useCallback(async (probed: ServerType) => {
    if (probed.kind === 'offline') {
      setStatus('ok');
      return;
    }
    setStatus('wait');
    const probe = await probeUri(probed.uri);
    if (!mounted.current) {
      return;
    }
    setStatus(probe.latency === null ? 'bad' : 'ok');
    setBlockHeight(probe.height);
    setLatencies(l => ({ ...l, [probed.uri]: probe.latency }));
  }, []);

  useEffect(() => {
    probeCurrent(server);
  }, [server, probeCurrent]);

  const probeChain = useCallback(
    async (chain: ChainNameEnum) => {
      if (chain === ChainNameEnum.regtestChainName) {
        return;
      }
      const list =
        lists[chain] ?? (await otherServersFor(translate, chain, online));
      if (!mounted.current) {
        return;
      }
      setLists(l => (l[chain] ? l : { ...l, [chain]: list }));
      const pending = [...recommendedServers(translate, chain), ...list].filter(
        s => !known.current.has(s.uri),
      );
      pending.forEach(s => known.current.add(s.uri));
      await Promise.all(
        pending.map(async s => {
          const probe = await probeUri(s.uri);
          if (mounted.current) {
            setLatencies(l => ({ ...l, [s.uri]: probe.latency }));
          }
        }),
      );
    },
    [lists, translate, online],
  );

  // Reconnects the open wallet to `next`, or keeps it for another; true once it holds.
  const apply = async (
    next: ServerType,
    mode: SelectServerEnum,
  ): Promise<boolean> => {
    setBusy(true);
    setStatus('wait');
    if (forDraft) {
      setAddWalletDraft({ server: next, selectServer: mode });
      setBusy(false);
      probeCurrent(next);
      return true;
    }
    if (!isOpen && target) {
      const kept = await SettingsFileImpl.writeWalletServer(
        target.id,
        next,
        mode,
      );
      if (!mounted.current) {
        return kept;
      }
      setBusy(false);
      if (kept) {
        setStored({ server: next, selectServer: mode });
        refreshWallets();
      } else {
        probeCurrent(server);
      }
      return kept;
    }
    const result = await setServerOption(next, mode, true);
    if (!mounted.current) {
      return result.kind === 'ok';
    }
    setBusy(false);
    if (result.kind === 'error') {
      probeCurrent(server);
    }
    return result.kind === 'ok';
  };

  const chooseAutomatic = async (chain: ChainNameEnum) => {
    setBusy(true);
    setStatus('wait');
    const pick = await pickAutomatic(translate, chain, online);
    if (!mounted.current) {
      return;
    }
    if (!pick) {
      setBusy(false);
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      probeCurrent(server);
      return;
    }
    // No server answered: Automatic still settles on the chain's default.
    if (pick.tier === 'default') {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
    }
    await apply(remoteServer(pick.server.uri, chain), SelectServerEnum.auto);
  };

  const close = () => setLeaving('back');

  useEffect(() => {
    if (leaving !== 'back') {
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Route.Home);
    }
  }, [leaving, navigation]);

  /**
   * The back arrow and Android's back: the other servers' list closes first,
   * nothing leaves while a server is being set, and an unsaved custom server
   * asks.
   */
  const held = leaving === 'none' && (other !== null || busy || guarded);
  usePreventRemove(held, () => {
    if (other !== null) {
      setOther(null);
      return;
    }
    if (!busy) {
      backGuard.current?.();
    }
  });
  /**
   * iOS's native swipe would half-pop the screen and bounce back while it is
   * held: it is off then. From the other servers' list, a swipe from the
   * left edge goes back to Server.
   */
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !held });
  }, [held, navigation]);
  const swipeToServer = useEdgeSwipeBack(
    other !== null ? () => setOther(null) : undefined,
  );

  const unreachable = () =>
    addLastSnackbar(
      translate('server.server-unreachable') as string,
      SnackbarDurationEnum.short,
    );

  return (
    <GestureDetector gesture={swipeToServer}>
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
      >
        <Header
          title={
            translate(
              other === null ? 'server.title' : 'server.other',
            ) as string
          }
          /**
           * As the old bar's back: Other servers closes first; then nothing
           * while a server is being set, and an unsaved one asks.
           */
          closeScreen={() => {
            if (other !== null) {
              setOther(null);
            } else if (!busy && !backGuard.current?.()) {
              close();
            }
          }}
          backDisabled={busy}
          backTestID={other === null ? 'server.back' : 'serverlist.back'}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
        />
        {other === null ? (
          <Animated.View
            key="server"
            entering={moved.current ? axisEnter(-AXIS_PT) : undefined}
            exiting={axisExit(-AXIS_PT)}
            style={{ flex: 1 }}
          >
            <Server
              placement="belowHeader"
              translate={translate}
              initialChain={walletChainName}
              networkLocked={networkLocked}
              networkNote={
                forDraft && draft.keyChain.kind === 'key'
                  ? (translate('server.from-key') as string)
                  : undefined
              }
              server={server}
              selectServer={selectServer}
              status={status}
              blockHeight={blockHeight}
              busy={busy}
              online={online}
              recommended={serverUris(translate).filter(s => s.recommended)}
              latencies={latencies}
              onAuto={chooseAutomatic}
              onPick={s =>
                apply(remoteServer(s.uri, s.chainName), SelectServerEnum.list)
              }
              onSaveCustom={(chain, uri) =>
                apply(remoteServer(uri, chain), SelectServerEnum.custom)
              }
              onOffline={(on, chain) =>
                on
                  ? apply(offlineServer(walletChainName), selectServer)
                  : chooseAutomatic(
                      chain === ChainNameEnum.regtestChainName
                        ? ChainNameEnum.mainChainName
                        : chain,
                    )
              }
              onOther={setOther}
              onProbe={probeChain}
              onUnreachable={unreachable}
              onBack={close}
              backGuard={backGuard}
              onGuard={setGuarded}
            />
          </Animated.View>
        ) : (
          <Animated.View
            key="other"
            entering={axisEnter(AXIS_PT)}
            exiting={axisExit(AXIS_PT)}
            style={{ flex: 1 }}
          >
            <ServerList
              placement="belowHeader"
              translate={translate}
              servers={lists[other] ?? []}
              loading={!lists[other]}
              latencies={latencies}
              selectedUri={
                server.kind === 'remote' &&
                server.chainName === other &&
                selectServer === SelectServerEnum.list
                  ? server.uri
                  : null
              }
              busy={busy}
              onPick={s =>
                apply(remoteServer(s.uri, s.chainName), SelectServerEnum.list)
              }
              onUnreachable={unreachable}
              onBack={() => setOther(null)}
            />
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
};

export default WalletServer;
