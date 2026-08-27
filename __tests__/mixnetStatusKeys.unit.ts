/**
 * Evidence test for the PR 1343 review finding F10: the mixnet status
 * keys were hand-copied as bare string literals in three modules with no
 * shared, compiler-checked source. The presenter must export the closed
 * key set, and every view it derives must stay inside it.
 */
import {
  MIXNET_STATUS_KEYS,
  INITIAL_MIXNET_VIEW,
  OFF_MIXNET_VIEW,
  deriveMixnetView,
} from '../app/walletBackend/transforms/mixnetPresenter';
import { RPCMixnetIndicatorEnum } from '../app/walletBackend/enums/RPCMixnetIndicatorEnum';

test('F10: the presenter exports the closed status-key set', () => {
  expect(MIXNET_STATUS_KEYS).toEqual([
    'mixnet.status.off',
    'mixnet.status.unknown',
    'mixnet.status.bootstrapping',
    'mixnet.status.ready',
    'mixnet.status.died',
  ]);
});

test('F10: every derivable view stays inside the closed key set', () => {
  const keys = new Set<string>(MIXNET_STATUS_KEYS);
  const derived = [
    INITIAL_MIXNET_VIEW,
    OFF_MIXNET_VIEW,
    deriveMixnetView(
      { kind: 'failure', failure: { reason: 'unconsentedOff' } },
      null,
    ),
    deriveMixnetView({ kind: 'status', indicator: RPCMixnetIndicatorEnum.off, socks5Addr: null }, null),
    deriveMixnetView({ kind: 'status', indicator: RPCMixnetIndicatorEnum.bootstrapping, socks5Addr: null }, null),
    deriveMixnetView({ kind: 'status', indicator: RPCMixnetIndicatorEnum.ready, socks5Addr: '127.0.0.1:1' }, null),
    deriveMixnetView({ kind: 'status', indicator: RPCMixnetIndicatorEnum.died, socks5Addr: null }, null),
  ];
  derived.forEach(view => expect(keys.has(view.statusKey)).toBe(true));
});
