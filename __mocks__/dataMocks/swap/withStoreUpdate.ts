import type { SwapRecordType } from '@app/swap/SwapRecordType';

type StoreMock = {
  readAll?: () => Promise<SwapRecordType[]>;
  getByRecordId?: (recordId: string) => Promise<unknown>;
  upsert: (record: SwapRecordType) => Promise<void>;
};

/**
 * Gives a store mock the real store's `update`: the change runs on the latest
 * record, and only a new object reaches `upsert`.
 */
export const withStoreUpdate = <T extends StoreMock>(mock: T) => {
  const written = new Map<string, SwapRecordType>();
  return {
    ...mock,
    update: async (
      recordId: string,
      change: (current: SwapRecordType) => SwapRecordType,
    ): Promise<SwapRecordType | undefined> => {
      const listed = (await mock.readAll?.())?.find(
        r => r.recordId === recordId,
      );
      const current =
        written.get(recordId) ??
        listed ??
        ((await mock.getByRecordId?.(recordId)) as SwapRecordType | undefined);
      if (!current) return undefined;
      const next = change(current);
      if (next === current) return next;
      written.set(recordId, next);
      await mock.upsert(next);
      return next;
    },
  };
};
