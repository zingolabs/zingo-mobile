import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadingProvider,
  defaultAppContextLoading,
} from '@app/context';
import { ChainNameEnum, SelectServerEnum, ServerUrisType } from '@app/AppState';
import { offlineServer, remoteServer } from '@app/AppState/types/ServerType';
import Server from '@screens/Server';
import ServerList from '@screens/ServerList';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

const entry = (uri: string, chainName: ChainNameEnum): ServerUrisType => ({
  uri,
  chainName,
  region: 'Global',
  default: false,
  latency: null,
  obsolete: false,
});

const servers = [
  entry('https://zec.rocks:443', ChainNameEnum.mainChainName),
  entry('https://na.zec.rocks:443', ChainNameEnum.mainChainName),
  entry('https://testnet.zec.rocks:443', ChainNameEnum.testChainName),
];

const handlers = () => ({
  onAuto: jest.fn(),
  onPick: jest.fn(),
  onTestCustom: jest.fn().mockResolvedValue(true),
  onOffline: jest.fn(),
  onChoose: jest.fn(),
  onProbe: jest.fn(),
  onBack: jest.fn(),
});

const wrap = (node: React.ReactElement) =>
  render(
    <ContextAppLoadingProvider
      value={{ ...defaultAppContextLoading, translate: mockTranslate }}
    >
      {node}
    </ContextAppLoadingProvider>,
  );

const mount = (
  props: Partial<React.ComponentProps<typeof Server>>,
  h = handlers(),
) =>
  wrap(
    <Server
      server={remoteServer(
        'https://zec.rocks:443',
        ChainNameEnum.mainChainName,
      )}
      selectServer={SelectServerEnum.auto}
      status="ok"
      blockHeight="3473752"
      busy={false}
      servers={servers}
      loadedChains={[ChainNameEnum.mainChainName, ChainNameEnum.testChainName]}
      latencies={{}}
      {...h}
      {...props}
    />,
  );

test('Tests that the testnet servers are listed and probed when the Testnet segment is pressed', () => {
  const h = handlers();
  mount({}, h);
  expect(screen.getByTestId('server.choose')).toBeOnTheScreen();
  expect(screen.queryByTestId('server.pick.testnet.zec.rocks:443')).toBeNull();
  fireEvent.press(
    screen.getByTestId(`server.net.${ChainNameEnum.testChainName}`),
  );
  expect(
    screen.getByTestId('server.pick.testnet.zec.rocks:443'),
  ).toBeOnTheScreen();
  expect(h.onProbe).toHaveBeenLastCalledWith(ChainNameEnum.testChainName);
});

test('Tests that a listed server is picked and the drill-in opens the list when their rows are pressed', () => {
  const h = handlers();
  mount({}, h);
  fireEvent.press(screen.getByTestId('server.choose'));
  expect(h.onChoose).toHaveBeenCalledTimes(1);
  fireEvent.press(
    screen.getByTestId(`server.net.${ChainNameEnum.testChainName}`),
  );
  fireEvent.press(screen.getByTestId('server.pick.testnet.zec.rocks:443'));
  expect(h.onPick).toHaveBeenCalledWith(servers[2]);
});

test('Tests that Automatic is not chosen again when it is already the mode', () => {
  const h = handlers();
  mount({}, h);
  fireEvent.press(screen.getByTestId('server.auto'));
  expect(h.onAuto).not.toHaveBeenCalled();
});

test('Tests that the Offline switch turns offline on for the shown chain when a server is active', () => {
  const h = handlers();
  mount({}, h);
  fireEvent.press(screen.getByTestId('server.offline'));
  expect(h.onOffline).toHaveBeenCalledWith(true, ChainNameEnum.mainChainName);
});

test('Tests that the rows are locked and the switch turns offline off when the app is offline', () => {
  const h = handlers();
  mount({ server: offlineServer(ChainNameEnum.mainChainName) }, h);
  fireEvent.press(screen.getByTestId('server.choose'));
  expect(h.onChoose).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('server.offline'));
  expect(h.onOffline).toHaveBeenCalledWith(false, ChainNameEnum.mainChainName);
});

test('Tests that a server that did not answer is refused and a reachable one is picked in the server list', () => {
  const onPick = jest.fn();
  const onUnreachable = jest.fn();
  wrap(
    <ServerList
      servers={servers.slice(0, 2)}
      latencies={{
        'https://zec.rocks:443': null,
        'https://na.zec.rocks:443': 142,
      }}
      selectedUri={null}
      loading={false}
      busy={false}
      onPick={onPick}
      onUnreachable={onUnreachable}
      onBack={jest.fn()}
    />,
  );
  fireEvent.press(screen.getByTestId('serverlist.pick.zec.rocks:443'));
  expect(onUnreachable).toHaveBeenCalledTimes(1);
  expect(onPick).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('serverlist.pick.na.zec.rocks:443'));
  expect(onPick).toHaveBeenCalledWith(servers[1]);
});

test('Tests that loading dots stand in for the listed servers until the chain list arrives', () => {
  mount({ loadedChains: [] });
  fireEvent.press(
    screen.getByTestId(`server.net.${ChainNameEnum.testChainName}`),
  );
  expect(screen.getByTestId('server.list.loading')).toBeOnTheScreen();

  wrap(
    <ServerList
      servers={[]}
      loading={true}
      latencies={{}}
      selectedUri={null}
      busy={false}
      onPick={jest.fn()}
      onUnreachable={jest.fn()}
      onBack={jest.fn()}
    />,
  );
  expect(screen.getByTestId('serverlist.loading')).toBeOnTheScreen();
});
