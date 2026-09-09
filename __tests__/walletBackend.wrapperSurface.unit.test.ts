/**
 * The whole one-line wrapper surface of walletUtils, table-driven
 * (zingo-mobile#1151): every wrapper passes a resolution through verbatim
 * — even one wearing the historical error sentinel — and funnels a
 * rejection into the typed error, code preserved. If any wrapper regresses
 * to catching the rejection and returning prose in the data channel, its
 * row turns red. The init and migration families have their own suites;
 * this table covers the rest of the surface.
 */
// Every member of the mocked bridge is a lazily created jest.fn, so a future
// import-time touch of some other RPCModule member cannot break this suite.
jest.mock('@app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
});

import RPCModule from '@app/RPCModule';
import { FfiResult } from '@app/walletBackend/ffi';
import {
  changeServer,
  checkMyAddress,
  createNewTransparentAddress,
  createNewUnifiedAddress,
  drainOrchard,
  drainStatus,
  getBalanceInfo,
  getDonationAddress,
  getLatestBlockServerInfo,
  getServerInfo,
  getSpendableBalanceWithAddress,
  getTotalMemobytesToAddress,
  getTotalSpendsToAddress,
  getTotalValueToAddress,
  getVersionInfo,
  getWalletKind,
  getZenniesDonationAddress,
  parseAddress,
  planOrchardDrain,
  removeTransaction,
  sendPropose,
  setConfigWalletToProd,
  setCryptoDefaultProvider,
  shieldConfirm,
  shieldPropose,
} from '@app/walletBackend/utils/walletUtils';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

// A resolution that wears the historical error sentinel: it must pass
// through every wrapper verbatim, never classified as a failure.
const proseLikeData = 'Error: looks like prose but is legitimate data';

// [bridge member, wrapper name, wrapper call]
const wrappers: Array<[string, string, () => Promise<FfiResult<string>>]> = [
  ['changeServerProcess', 'changeServer', () => changeServer('uri')],
  ['infoServerInfo', 'getServerInfo', () => getServerInfo()],
  [
    'setConfigWalletToProdProcess',
    'setConfigWalletToProd',
    () => setConfigWalletToProd('Medium', '1'),
  ],
  [
    'setCryptoDefaultProvider',
    'setCryptoDefaultProvider',
    () => setCryptoDefaultProvider(),
  ],
  ['getBalanceInfo', 'getBalanceInfo', () => getBalanceInfo()],
  ['getVersionInfo', 'getVersionInfo', () => getVersionInfo()],
  ['walletKindInfo', 'getWalletKind', () => getWalletKind()],
  ['getDonationAddress', 'getDonationAddress', () => getDonationAddress()],
  [
    'getZenniesDonationAddress',
    'getZenniesDonationAddress',
    () => getZenniesDonationAddress(),
  ],
  ['sendProcess', 'sendPropose', () => sendPropose('{}')],
  ['planOrchardDrainProcess', 'planOrchardDrain', () => planOrchardDrain()],
  ['drainOrchardProcess', 'drainOrchard', () => drainOrchard()],
  ['drainStatusProcess', 'drainStatus', () => drainStatus()],
  [
    'getSpendableBalanceWithAddressInfo',
    'getSpendableBalanceWithAddress',
    () => getSpendableBalanceWithAddress('u1...', 'false'),
  ],
  ['parseAddressInfo', 'parseAddress', () => parseAddress('u1...')],
  [
    'getTotalValueToAddressInfo',
    'getTotalValueToAddress',
    () => getTotalValueToAddress(),
  ],
  [
    'getTotalSpendsToAddressInfo',
    'getTotalSpendsToAddress',
    () => getTotalSpendsToAddress(),
  ],
  [
    'getTotalMemobytesToAddressInfo',
    'getTotalMemobytesToAddress',
    () => getTotalMemobytesToAddress(),
  ],
  [
    'createNewUnifiedAddressProcess',
    'createNewUnifiedAddress',
    () => createNewUnifiedAddress('ozt'),
  ],
  [
    'createNewTransparentAddressProcess',
    'createNewTransparentAddress',
    () => createNewTransparentAddress(),
  ],
  [
    'removeTransactionProcess',
    'removeTransaction',
    () => removeTransaction('txid'),
  ],
  ['checkMyAddressInfo', 'checkMyAddress', () => checkMyAddress('u1...')],
  [
    'getLatestBlockServerInfo',
    'getLatestBlockServerInfo',
    () => getLatestBlockServerInfo('uri'),
  ],
  ['shieldProcess', 'shieldPropose', () => shieldPropose()],
  ['confirmProcess', 'shieldConfirm', () => shieldConfirm()],
];

describe.each(wrappers)('%s → %s', (member, _wrapper, call) => {
  it('passes a resolution through verbatim', async () => {
    bridge[member].mockResolvedValueOnce(proseLikeData);
    await expect(call()).resolves.toEqual({ ok: true, value: proseLikeData });
  });

  it('funnels a rejection into the typed error, code preserved', async () => {
    bridge[member].mockReturnValueOnce(
      Promise.reject(Object.assign(new Error('boom'), { code: 'Read' })),
    );
    await expect(call()).resolves.toEqual({
      ok: false,
      error: { code: 'Read', message: 'boom' },
    });
  });
});
