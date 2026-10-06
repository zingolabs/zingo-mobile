import { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import { mockServer } from './mockServer';

export function mockWalletBackendConfig(
  overrides: Partial<WalletBackendConfig> = {},
): WalletBackendConfig {
  return {
    onBalanceChanged: jest.fn(),
    onValueTransfersChanged: jest.fn(),
    onMessagesChanged: jest.fn(),
    onAddressesChanged: jest.fn(),
    onInfoChanged: jest.fn(),
    onSyncStatusChanged: jest.fn(),
    onZingolibVersionChanged: jest.fn(),
    onBirthdayChanged: jest.fn(),
    onError: jest.fn(),
    onPersistentSyncFailure: jest.fn(),
    onMixnetViewChanged: jest.fn(),
    startMixnetTransport: jest.fn(),
    stopMixnetTransport: jest.fn().mockResolvedValue(undefined),
    mixnetSupported: false,
    keepAwake: jest.fn(),
    readOnly: false,
    server: mockServer,
    ...overrides,
  };
}
