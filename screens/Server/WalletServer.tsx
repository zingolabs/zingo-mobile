/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  ChainNameEnum,
  Route,
  SelectServerEnum,
  ServerType,
} from '@app/AppState';
import { offlineServer, remoteServer } from '@app/AppState/types/ServerType';
import { ServerStatus } from '@app/AppState/types/ServerStatus';
import { AppDrawerParamList } from '@app/types';
import { loadDefaultIndexer } from '@app/uris/defaultIndexer';
import { pickAutomatic, probeUri } from '@app/services/serverPicking';
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
  const [defaults, setDefaults] = useState<Record<string, string | null>>({});
  const backGuard = useRef<(() => boolean) | null>(null);
  const leaving = useRef(false);
  const mounted = useRef(true);
  const timed = useRef(new Set<string>());

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

  // Asks the Binding Layer for a chain's Default Indexer and times it once.
  const probeChain = useCallback(async (chain: ChainNameEnum) => {
    if (chain === ChainNameEnum.regtestChainName) {
      return;
    }
    const uri = await loadDefaultIndexer(chain);
    if (!mounted.current) {
      return;
    }
    setDefaults(d => (chain in d ? d : { ...d, [chain]: uri }));
    if (!uri || timed.current.has(uri)) {
      return;
    }
    timed.current.add(uri);
    const probe = await probeUri(uri);
    if (mounted.current) {
      setLatencies(l => ({ ...l, [uri]: probe.latency }));
    }
  }, []);

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

  // Automatic is the chain's Default Indexer; a chain without one has no
  // Automatic row, so this only runs for a chain that has one.
  const chooseAutomatic = async (chain: ChainNameEnum) => {
    setBusy(true);
    setStatus('wait');
    const picked = await pickAutomatic(chain);
    if (!mounted.current) {
      return;
    }
    if (!picked) {
      setBusy(false);
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      probeCurrent(server);
      return;
    }
    await apply(picked, SelectServerEnum.auto);
  };

  const close = () => {
    leaving.current = true;
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Route.Home);
    }
  };

  useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        if (leaving.current) {
          return;
        }
        if (busy || backGuard.current?.()) {
          e.preventDefault();
        }
      }),
    [navigation, busy],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}>
      <Header
        title={''}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />
      <Server
        placement="belowHeader"
        translate={translate}
        server={server}
        selectServer={selectServer}
        status={status}
        blockHeight={blockHeight}
        busy={busy}
        online={online}
        defaults={defaults}
        latencies={latencies}
        onAuto={chooseAutomatic}
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
        onProbe={probeChain}
        onBack={close}
        backGuard={backGuard}
      />
    </View>
  );
};

export default WalletServer;
