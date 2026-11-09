import {
  DELIVERY_WATCH_MS,
  lacksDelivery,
  watchesDelivery,
} from '@app/swap/deliveryWatch';
import { SwapDirectionEnum } from '@app/swap/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/SwapRecordType';

const T0 = 1_700_000_000_000;
const record = (overrides: Partial<SwapRecordType> = {}) =>
  ({
    provider: SwapKitProviderEnum.ThorchainStreaming,
    direction: SwapDirectionEnum.Inbound,
    status: SwapStatusEnum.Completed,
    terminalAtMs: T0,
    ...overrides,
  }) as SwapRecordType;

describe('watchesDelivery', () => {
  test.each([
    SwapKitProviderEnum.MayachainStreaming,
    SwapKitProviderEnum.ThorchainStreaming,
  ])(
    'Tests that a completed %s purchase is watched when it has no delivery.',
    provider => {
      expect(watchesDelivery(record({ provider }), T0 + 1)).toBe(true);
    },
  );

  test('Tests that the watch ends when its window has passed.', () => {
    expect(watchesDelivery(record(), T0 + DELIVERY_WATCH_MS)).toBe(false);
  });

  test('Tests that nothing is watched when the delivery is on the record.', () => {
    expect(
      watchesDelivery(record({ destinationTxHash: 'ab'.repeat(32) }), T0 + 1),
    ).toBe(false);
  });

  test('Tests that a NEAR purchase and a sale are not watched.', () => {
    expect(
      watchesDelivery(record({ provider: SwapKitProviderEnum.Near }), T0 + 1),
    ).toBe(false);
    expect(
      watchesDelivery(
        record({ direction: SwapDirectionEnum.Outbound }),
        T0 + 1,
      ),
    ).toBe(false);
    expect(
      lacksDelivery(record({ direction: SwapDirectionEnum.Outbound })),
    ).toBe(false);
  });

  test('Tests that a swap the provider refunded is not watched.', () => {
    expect(
      watchesDelivery(record({ status: SwapStatusEnum.Refunded }), T0 + 1),
    ).toBe(false);
  });
});
