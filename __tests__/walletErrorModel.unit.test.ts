import {
  WalletErrorCause,
  WalletLoadKind,
} from '@app/AppState/types/WalletErrorInfo';
import { walletErrorModel } from '@screens/WalletError/walletErrorModel';

const INITS: WalletLoadKind[] = ['create', 'restore'];
const LOADS: WalletLoadKind[] = ['open', ...INITS];
const SHARED_CAUSES: WalletErrorCause[] = ['server', 'unknown'];

describe('walletErrorModel', () => {
  test('Tests that a cause offers the same fix when the load changes', () => {
    for (const cause of SHARED_CAUSES) {
      const [first, ...rest] = LOADS.map(
        load => walletErrorModel(cause, load).primary,
      );
      rest.forEach(primary => expect(primary).toBe(first));
    }
  });

  test('Tests that a server failure offers another server when it is the cause', () => {
    for (const load of LOADS) {
      const model = walletErrorModel('server', load);
      expect(model.primary).toBe('server');
      expect(model.titleKey).toBe('walleterror.server-title');
    }
  });

  test('Tests that an unknown failure names the load when nothing better is known', () => {
    expect(walletErrorModel('unknown', 'open').titleKey).toBe(
      'walleterror.open-title',
    );
    expect(walletErrorModel('unknown', 'create').titleKey).toBe(
      'walleterror.create-title',
    );
    expect(walletErrorModel('unknown', 'restore').titleKey).toBe(
      'walleterror.restore-title',
    );
    expect(walletErrorModel('unknown', 'restore').primary).toBe('retry');
  });

  test('Tests that the way out is Back when the load came from a screen', () => {
    for (const load of INITS) {
      const model = walletErrorModel('unknown', load);
      expect(model.above).toBe('none');
      expect(model.below).toBe('back');
    }
  });

  test('Tests that the way out replaces the wallet when an open fails', () => {
    const model = walletErrorModel('file', 'open');
    expect(model.primary).toBe('retry');
    expect(model.above).toBe('import');
    expect(model.below).toBe('create');
  });

  test('Tests that a key failure only goes back when a retry would rerun the same key', () => {
    const model = walletErrorModel('key', 'restore');
    expect(model.primary).toBe('back');
    expect(model.above).toBe('none');
    expect(model.below).toBe('none');
  });

  test('Tests that a chain failure offers the switch when the wallet is on another network', () => {
    const model = walletErrorModel('chain', 'open');
    expect(model.primary).toBe('chain');
    expect(model.above).toBe('more');
    expect(model.below).toBe('none');
  });
});
