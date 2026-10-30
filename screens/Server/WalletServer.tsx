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

// The Server screen inside the wallet: a choice reconnects the open wallet,
// and a server on another network goes to the recovery screen.
type WalletServerProps = NativeStackScreenProps<AppDrawerParamList, 'Server'>;

const WalletServer: React.FC<WalletServerProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const {
    setServerOption,
    translate,
    server,
    selectServer,
    netInfo,
    walletChainName,
    readOnly,
    addLastSnackbar,
  } = useContext(ContextAppLoaded);
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

  const probeCurrent = useCallback(async (target: ServerType) => {
    if (target.kind === 'offline') {
      setStatus('ok');
      return;
    }
    setStatus('wait');
    const probe = await probeUri(target.uri);
    if (!mounted.current) {
      return;
    }
    setStatus(probe.latency === null ? 'bad' : 'ok');
    setBlockHeight(probe.height);
    setLatencies(l => ({ ...l, [target.uri]: probe.latency }));
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

  // Reconnects the wallet to `target`; true once it uses it.
  const apply = async (
    target: ServerType,
    mode: SelectServerEnum,
  ): Promise<boolean> => {
    setBusy(true);
    setStatus('wait');
    const sameChain =
      target.kind === 'offline' || target.chainName === walletChainName;
    const result = await setServerOption(target, mode, true, sameChain);
    if (!mounted.current) {
      return result.kind === 'ok';
    }
    setBusy(false);
    if (result.kind === 'chain-changed') {
      setLeaving('away');
      if (readOnly) {
        navigation.navigate(Route.ViewingKey, {
          entry: { kind: 'push' },
          switchTo: target.chainName,
        });
      } else {
        navigation.navigate(Route.WalletSeed, { action: 'server' });
      }
      return false;
    }
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
          title={''}
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
