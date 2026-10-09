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
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  ChainNameEnum,
  RouteEnum,
  SeedActionEnum,
  SelectServerEnum,
  ServerType,
  ServerUrisType,
  SnackbarDurationEnum,
  UfvkActionEnum,
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

type WalletServerProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Server
>;

// The Server screen inside the wallet: a choice reconnects the open wallet,
// and a server on another network goes to the recovery screen.
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
  const leaving = useRef(false);
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
      leaving.current = true;
      if (readOnly) {
        navigation.navigate(RouteEnum.Ufvk, { action: UfvkActionEnum.server });
      } else {
        navigation.navigate(RouteEnum.Seed, { action: SeedActionEnum.server });
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
    await apply(remoteServer(pick.uri, chain), SelectServerEnum.auto);
  };

  const close = () => {
    leaving.current = true;
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(RouteEnum.Home);
    }
  };

  useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        if (leaving.current) {
          return;
        }
        if (other !== null) {
          e.preventDefault();
          setOther(null);
          return;
        }
        if (busy || backGuard.current?.()) {
          e.preventDefault();
        }
      }),
    [navigation, other, busy],
  );

  const unreachable = () =>
    addLastSnackbar(
      translate('server.server-unreachable') as string,
      SnackbarDurationEnum.short,
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      {other === null ? (
        <Animated.View
          key="server"
          entering={moved.current ? axisEnter(-AXIS_PT) : undefined}
          exiting={axisExit(-AXIS_PT)}
          style={{ flex: 1 }}
        >
          <Server
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
  );
};

export default WalletServer;
