/**
 * The SettingsFileImpl.writeSettings concurrent-write race, below the component.
 *
 * SettingsFileImpl.writeSettings reads the whole file, merges one key, and
 * writes the whole file back. Today it fires RNFS.writeFile unawaited, so two
 * concurrent writes to different keys both read the pre-write file and the
 * later write drops the earlier key. These pins are pre-change red: both keys
 * must survive two concurrent writes, and the returned promise must not resolve
 * until the write has landed. They go green once the read-merge-write
 * serializes behind a single-flight queue and the write is awaited.
 */

// SettingsFileImpl reaches app/uris → app/utils → app/walletBackend → RPCModule
// at import time. The native bridge is absent under jest, so stub it the same
// way the sibling backend tests do.
jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('react-native-fs', () => {
  const store: { data: string | undefined } = { data: undefined };
  return {
    __esModule: true,
    DocumentDirectoryPath: '/doc',
    exists: jest.fn(async () => store.data !== undefined),
    readFile: jest.fn(async () => store.data),
    writeFile: jest.fn(
      (_path: string, data: string) =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            store.data = data;
            resolve();
          }, 10);
        }),
    ),
    __store: store,
  };
});

import * as RNFS from 'react-native-fs';
import SettingsFileImpl from '../components/Settings/SettingsFileImpl';
import { SettingsNameEnum } from '../app/AppState';

const store = (RNFS as unknown as { __store: { data: string | undefined } })
  .__store;
const writeFile = RNFS.writeFile as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  store.data = undefined;
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SettingsFileImpl.writeSettings serialization', () => {
  test('two concurrent writes to different keys both persist', async () => {
    const a = SettingsFileImpl.writeSettings(SettingsNameEnum.sendAll, true);
    const b = SettingsFileImpl.writeSettings(SettingsNameEnum.donation, true);

    await jest.runAllTimersAsync();
    await Promise.all([a, b]);

    expect(store.data).toBeDefined();
    const persisted = JSON.parse(store.data as string);
    expect(persisted.sendAll).toBe(true);
    expect(persisted.donation).toBe(true);
  });

  test('the returned promise resolves only after the write lands', async () => {
    const order: string[] = [];
    writeFile.mockImplementationOnce(
      (_path: string, data: string) =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            store.data = data;
            order.push('write');
            resolve();
          }, 10);
        }),
    );

    const settled = SettingsFileImpl.writeSettings(
      SettingsNameEnum.sendAll,
      true,
    ).then(() => order.push('resolve'));

    await jest.runAllTimersAsync();
    await settled;

    expect(order).toEqual(['write', 'resolve']);
  });
});
