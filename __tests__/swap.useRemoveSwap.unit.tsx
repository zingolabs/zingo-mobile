jest.mock('@app/services/showConfirm', () => ({ showConfirm: jest.fn() }));

import React from 'react';
import { renderHook } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { showConfirm } from '@app/services/showConfirm';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import { useRemoveSwap } from '@screens/Swap/useRemoveSwap';

const messageFor = (status: SwapStatusEnum): string => {
  (showConfirm as jest.Mock).mockClear();
  const { result } = renderHook(() => useRemoveSwap(jest.fn()), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ContextAppLoadedProvider
        value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
      >
        {children}
      </ContextAppLoadedProvider>
    ),
  });
  result.current({ recordId: 'r', status } as SwapRecordType);
  const options = (showConfirm as jest.Mock).mock.calls[0][0];
  expect(options.title).toBe('swap.delete');
  return options.message;
};

test('Tests that the delete sheet says which swap goes: one with no deposit, a failed one, an unsent sale', () => {
  expect(messageFor(SwapStatusEnum.Expired)).toBe('swap.delete-expired-body');
  expect(messageFor(SwapStatusEnum.Failed)).toBe('swap.delete-failed-body');
  expect(messageFor(SwapStatusEnum.PendingDeposit)).toBe(
    'swap.detail-remove-unpaid',
  );
});
