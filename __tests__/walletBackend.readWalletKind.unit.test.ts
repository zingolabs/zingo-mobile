jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { readWalletKind } from '@app/walletBackend';
import { RPCWalletKindEnum } from '@app/walletBackend/enums/RPCWalletKindEnum';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const kindJson = (kind: RPCWalletKindEnum) =>
  JSON.stringify({ kind, transparent: true, sapling: false, orchard: true });

test('Tests that a seed wallet reads as spendable with its pools', async () => {
  bridge.walletKindInfo.mockResolvedValue(
    kindJson(RPCWalletKindEnum.LoadedFromSeedPhrase),
  );
  expect(await readWalletKind()).toEqual({
    ok: true,
    value: {
      readOnly: false,
      orchardPool: true,
      saplingPool: false,
      transparentPool: true,
    },
  });
});

test('Tests that a viewing key wallet and a keyless wallet read as watch-only', async () => {
  for (const kind of [
    RPCWalletKindEnum.LoadedFromUnifiedFullViewingKey,
    RPCWalletKindEnum.NoKeysFound,
  ]) {
    bridge.walletKindInfo.mockResolvedValue(kindJson(kind));
    const result = await readWalletKind();
    expect(result.ok && result.value.readOnly).toBe(true);
  }
});

test('Tests that a rejected read and an unreadable kind are errors', async () => {
  bridge.walletKindInfo.mockResolvedValue('not json');
  expect((await readWalletKind()).ok).toBe(false);

  bridge.walletKindInfo.mockRejectedValue(
    Object.assign(new Error('no keys readable'), { code: 'Read' }),
  );
  expect(await readWalletKind()).toEqual({
    ok: false,
    error: { code: 'Read', message: 'no keys readable' },
  });
});
