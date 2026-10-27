jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import {
  swapOutcome,
  swapStepIndex,
  swapStepKeys,
} from '@screens/Swap/swapProgress';
import { swapScreenFor } from '@screens/Swap/swapRoute';
import { Route } from '@app/AppState';

const buy = (status: SwapStatusEnum) => ({
  direction: SwapDirectionEnum.Inbound,
  status,
});
const sell = (status: SwapStatusEnum) => ({
  direction: SwapDirectionEnum.Outbound,
  status,
});

test('Tests that a purchase walks four steps and a sale three', () => {
  expect(swapStepKeys(SwapDirectionEnum.Inbound)).toHaveLength(4);
  expect(swapStepKeys(SwapDirectionEnum.Outbound)).toHaveLength(3);
});

test('Tests that a purchase moves from waiting to detected to swapping to received as the status moves', () => {
  expect(swapStepIndex(buy(SwapStatusEnum.AwaitingExternalDeposit))).toBe(0);
  expect(swapStepIndex(buy(SwapStatusEnum.Pending))).toBe(1);
  expect(swapStepIndex(buy(SwapStatusEnum.Processing))).toBe(2);
  expect(swapStepIndex(buy(SwapStatusEnum.IncompleteDeposit))).toBe(2);
  expect(swapStepIndex(buy(SwapStatusEnum.Completed))).toBe(4);
});

test('Tests that a sale moves from sending to swapping to paid as the status moves', () => {
  expect(swapStepIndex(sell(SwapStatusEnum.PendingDeposit))).toBe(0);
  expect(swapStepIndex(sell(SwapStatusEnum.Pending))).toBe(1);
  expect(swapStepIndex(sell(SwapStatusEnum.Processing))).toBe(1);
  expect(swapStepIndex(sell(SwapStatusEnum.Completed))).toBe(3);
});

test('Tests that each ending lands on its own result when the swap stops moving', () => {
  expect(swapOutcome(SwapStatusEnum.Completed)).toBe('completed');
  expect(swapOutcome(SwapStatusEnum.Refunded)).toBe('refunded');
  expect(swapOutcome(SwapStatusEnum.IncompleteDeposit)).toBe('incomplete');
  expect(swapOutcome(SwapStatusEnum.Expired)).toBe('expired');
  expect(swapOutcome(SwapStatusEnum.Failed)).toBe('failed');
  expect(swapOutcome(SwapStatusEnum.Processing)).toBe('inFlight');
});

test('Tests that a swap opens on its deposit, its tracking or its detail when tapped by where it stands', () => {
  expect(swapScreenFor(buy(SwapStatusEnum.AwaitingExternalDeposit))).toBe(
    Route.SwapDeposit,
  );
  expect(swapScreenFor(sell(SwapStatusEnum.PendingDeposit))).toBe(
    Route.SwapDeposit,
  );
  expect(swapScreenFor(sell(SwapStatusEnum.Pending))).toBe(Route.SwapTracking);
  expect(swapScreenFor(buy(SwapStatusEnum.Pending))).toBe(Route.SwapTracking);
  expect(swapScreenFor(buy(SwapStatusEnum.Completed))).toBe(Route.SwapDetail);
  expect(swapScreenFor(buy(SwapStatusEnum.Expired))).toBe(Route.SwapDetail);
  expect(
    swapScreenFor({ ...buy(SwapStatusEnum.Pending), lateDepositAtMs: 1 }),
  ).toBe(Route.SwapDetail);
});
