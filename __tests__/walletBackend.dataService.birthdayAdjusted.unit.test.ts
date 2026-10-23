jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { DataService } from '@app/walletBackend/modules/DataService';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

function serviceReporting(seedInfo: object) {
  const onBirthdayChanged = jest.fn();
  const onBirthdayAdjusted = jest.fn();
  mockedBridge.getSeedInfo.mockResolvedValue(JSON.stringify(seedInfo));
  const service = new DataService(
    mockWalletBackendConfig({ onBirthdayChanged, onBirthdayAdjusted }),
  );
  return { service, onBirthdayChanged, onBirthdayAdjusted };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('Tests that the notice carries the height in use when zingolib raised a given height above 0', async () => {
  const { service, onBirthdayChanged, onBirthdayAdjusted } = serviceReporting({
    seed_phrase: 'a b c',
    birthday: 419200,
    birthday_adjusted_from: 1000,
  });

  await service.fetchWalletBirthdaySeedUfvk();

  expect(onBirthdayChanged).toHaveBeenCalledWith(419200);
  expect(onBirthdayAdjusted).toHaveBeenCalledWith(419200);
});

test.each([
  ['the empty birthday the app sent', { birthday_adjusted_from: 0 }],
  ['no adjustment', {}],
])(
  'Tests that no notice fires when zingolib reports %s',
  async (_case, adjustment) => {
    const { service, onBirthdayChanged, onBirthdayAdjusted } = serviceReporting(
      { seed_phrase: 'a b c', birthday: 419200, ...adjustment },
    );

    await service.fetchWalletBirthdaySeedUfvk();

    expect(onBirthdayChanged).toHaveBeenCalledWith(419200);
    expect(onBirthdayAdjusted).not.toHaveBeenCalled();
  },
);
