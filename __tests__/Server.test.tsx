import 'react-native';
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {
  ChainNameEnum,
  SelectServerEnum,
  ServerUrisType,
  TranslateType,
} from '@app/AppState';
import { offlineServer, remoteServer } from '@app/AppState/types/ServerType';
import Server from '@screens/Server';
import ServerList from '@screens/ServerList';
import { probeServer } from '@app/walletBackend';

jest.mock('@app/walletBackend', () => ({ probeServer: jest.fn() }));

const en = require('../app/translations/en.json');
const translate = (key: string): TranslateType =>
  key.split('.').reduce((o, k) => o?.[k], en) ?? key;
const probe = probeServer as jest.Mock;

const entry = (
  uri: string,
  chainName: ChainNameEnum,
  recommended = false,
): ServerUrisType => ({
  uri,
  chainName,
  region: 'Global',
  default: false,
  latency: null,
  obsolete: false,
  recommended,
});

const recommended = [
  entry('https://sa.zaino.example:443', ChainNameEnum.mainChainName, true),
  entry('https://na.zaino.example:443', ChainNameEnum.mainChainName, true),
];
const others = [
  entry('https://zec.rocks:443', ChainNameEnum.mainChainName),
  entry('https://na.zec.rocks:443', ChainNameEnum.mainChainName),
];

const handlers = () => ({
  onAuto: jest.fn(),
  onPick: jest.fn(),
  onSaveCustom: jest.fn().mockResolvedValue(true),
  onOffline: jest.fn(),
  onOther: jest.fn(),
  onProbe: jest.fn(),
  onUnreachable: jest.fn(),
  onBack: jest.fn(),
});

const mount = (
  props: Partial<React.ComponentProps<typeof Server>>,
  h = handlers(),
) =>
  render(
    <Server
      translate={translate}
      server={remoteServer(
        'https://sa.zaino.example:443',
        ChainNameEnum.mainChainName,
      )}
      selectServer={SelectServerEnum.auto}
      status="ok"
      blockHeight="3473752"
      busy={false}
      online={true}
      recommended={recommended}
      latencies={{
        'https://sa.zaino.example:443': 38,
        'https://na.zaino.example:443': null,
      }}
      {...h}
      {...props}
    />,
  );

const verified = (chainName = 'main') => ({
  ok: true,
  value: {
    outcome: 'verified',
    host: 'node.myhome.net',
    port: 9067,
    resolved: ['198.51.100.7'],
    literal: false,
    latencyMs: 120,
    chainName,
    blockHeight: 3473752,
    details: 'LightdInfo { .. }',
  },
});

const typeCustom = (text: string) => {
  fireEvent.press(screen.getByTestId('server.custom'));
  fireEvent.changeText(screen.getByTestId('server.custom.host'), text);
};

beforeEach(() => probe.mockReset());

test('Tests that Automatic and the recommended servers are on the main screen and Other servers drills in', () => {
  const h = handlers();
  mount({}, h);
  expect(screen.getByText('Fastest right now: sa.zaino.example')).toBeTruthy();
  expect(screen.getByTestId('server.pick.na.zaino.example')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('server.other'));
  expect(h.onOther).toHaveBeenCalledWith(ChainNameEnum.mainChainName);
  expect(h.onProbe).toHaveBeenLastCalledWith(ChainNameEnum.mainChainName);
});

test('Tests that a recommended server that did not answer shakes instead of being picked', () => {
  const h = handlers();
  mount({}, h);
  fireEvent.press(screen.getByTestId('server.pick.na.zaino.example'));
  expect(h.onUnreachable).toHaveBeenCalledTimes(1);
  expect(h.onPick).not.toHaveBeenCalled();
});

test('Tests that a recommended server that answered is picked', () => {
  const h = handlers();
  mount(
    {
      latencies: {
        'https://sa.zaino.example:443': 38,
        'https://na.zaino.example:443': 96,
      },
    },
    h,
  );
  fireEvent.press(screen.getByTestId('server.pick.na.zaino.example'));
  expect(h.onPick).toHaveBeenCalledWith(recommended[1]);
});

test('Tests that the rows are locked and the switch turns offline off when the app is offline', () => {
  const h = handlers();
  mount({ server: offlineServer(ChainNameEnum.mainChainName) }, h);
  fireEvent.press(screen.getByTestId('server.other'));
  expect(h.onOther).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('server.offline'));
  expect(h.onOffline).toHaveBeenCalledWith(false, ChainNameEnum.mainChainName);
});

test('Tests that pasting a full address splits it into host and port', () => {
  mount({});
  typeCustom('https://node.myhome.net:9067');
  expect(screen.getByTestId('server.custom.host').props.value).toBe(
    'node.myhome.net',
  );
  expect(screen.getByTestId('server.custom.port').props.value).toBe('9067');
});

test('Tests that typing a scheme drops it and a colon after the host moves to the port', () => {
  mount({});
  fireEvent.press(screen.getByTestId('server.custom'));
  const typed = 'https://na.zec.rocks:';
  for (let i = 1; i <= typed.length; i++) {
    const field = screen.getByTestId('server.custom.host');
    fireEvent.changeText(field, field.props.value + typed[i - 1]);
  }
  expect(screen.getByTestId('server.custom.host').props.value).toBe(
    'na.zec.rocks',
  );
  fireEvent.changeText(screen.getByTestId('server.custom.port'), '443');
  expect(screen.getByTestId('server.custom.port').props.value).toBe('443');
});

test('Tests that a passing test logs each step and asks to save, without switching', async () => {
  const h = handlers();
  probe.mockResolvedValue(verified());
  mount({}, h);
  typeCustom('node.myhome.net:9067');
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.custom.test'));
  });
  expect(probe).toHaveBeenCalledWith('https://node.myhome.net:9067');
  expect(screen.getByText('Testing node.myhome.net:9067…')).toBeTruthy();
  expect(screen.getByText('DNS resolved to 198.51.100.7')).toBeTruthy();
  expect(screen.getByText('GetLightdInfo responded in 120 ms')).toBeTruthy();
  expect(
    screen.getByText('Endpoint verified: Mainnet, block 3,473,752'),
  ).toBeTruthy();
  expect(
    screen.getByText('Works, but it isn’t saved yet. Tap Save to use it.'),
  ).toBeTruthy();
  expect(h.onSaveCustom).not.toHaveBeenCalled();
});

test('Tests that Save tests first and hands the server over once it passed', async () => {
  const h = handlers();
  probe.mockResolvedValue(verified());
  mount({}, h);
  typeCustom('node.myhome.net:9067');
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.custom.save'));
  });
  expect(probe).toHaveBeenCalledTimes(1);
  expect(h.onSaveCustom).toHaveBeenCalledWith(
    ChainNameEnum.mainChainName,
    'https://node.myhome.net:9067',
  );
  expect(
    screen.getByText('Saved! Zingo is now using node.myhome.net.'),
  ).toBeTruthy();
});

test('Tests that a server on another network fails the test and offers to switch', async () => {
  const h = handlers();
  probe.mockResolvedValue(verified('test'));
  mount({}, h);
  typeCustom('node.myhome.net:9067');
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.custom.save'));
  });
  expect(h.onSaveCustom).not.toHaveBeenCalled();
  expect(screen.getByText('chainName is “test”, expected “main”')).toBeTruthy();
  expect(screen.getByText('Not saved.')).toBeTruthy();
  expect(screen.getByTestId('server.custom.switch')).toBeOnTheScreen();
});

test('Tests that a host that does not resolve says what to fix', async () => {
  probe.mockResolvedValue({
    ok: true,
    value: {
      outcome: 'unresolved',
      host: 'down.example',
      port: 9067,
      cause: 'no such host',
    },
  });
  mount({});
  typeCustom('down.example:9067');
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.custom.test'));
  });
  expect(screen.getByText('Couldn’t resolve down.example')).toBeTruthy();
  expect(screen.getByText('Check the host for typos.')).toBeTruthy();
});

test('Tests that leaving with an unsaved address asks first, and Don’t Save leaves', async () => {
  const h = handlers();
  mount({}, h);
  typeCustom('node.myhome.net:9067');
  fireEvent.press(screen.getByTestId('server.done'));
  expect(h.onBack).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(screen.getByTestId('server.unsaved')).toBeOnTheScreen(),
  );
  expect(
    screen.getByText(
      'You haven’t saved node.myhome.net. Saving tests it first. If you leave now, Zingo keeps using sa.zaino.example (automatic).',
    ),
  ).toBeTruthy();
  fireEvent.press(screen.getByTestId('server.unsaved.discard'));
  expect(h.onBack).toHaveBeenCalledTimes(1);
});

test('Tests that a saved custom server reads as saved and leaves without asking', () => {
  const h = handlers();
  mount(
    {
      server: remoteServer(
        'https://node.myhome.net:9067',
        ChainNameEnum.mainChainName,
      ),
      selectServer: SelectServerEnum.custom,
    },
    h,
  );
  expect(screen.getByText('Saved')).toBeTruthy();
  expect(screen.getByText('Saved. Zingo is using this server.')).toBeTruthy();
  fireEvent.press(screen.getByTestId('server.back'));
  expect(h.onBack).toHaveBeenCalledTimes(1);
});

test('Tests that a server that did not answer is refused and a reachable one is picked in Other servers', () => {
  const onPick = jest.fn();
  const onUnreachable = jest.fn();
  render(
    <ServerList
      translate={translate}
      servers={others}
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
  expect(screen.getByText('Other servers')).toBeTruthy();
  fireEvent.press(screen.getByTestId('serverlist.pick.zec.rocks:443'));
  expect(onUnreachable).toHaveBeenCalledTimes(1);
  expect(onPick).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('serverlist.pick.na.zec.rocks:443'));
  expect(onPick).toHaveBeenCalledWith(others[1]);
});
