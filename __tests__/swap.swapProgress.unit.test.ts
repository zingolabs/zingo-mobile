jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import {
  DEPOSIT_WINDOW_MS,
  SWAP_STEP_COUNT,
  countdownText,
  depositDeadlineMs,
  swapOutcome,
  swapStepIndex,
} from '@screens/Swap/swapProgress';
import { swapScreenFor } from '@screens/Swap/swapRoute';
import { Route } from '@app/AppState';

test('Tests that the tracking step follows the status when the swap moves from deposit to payout', () => {
  expect(swapStepIndex(SwapStatusEnum.AwaitingExternalDeposit)).toBe(0);
  expect(swapStepIndex(SwapStatusEnum.PendingDeposit)).toBe(0);
  expect(swapStepIndex(SwapStatusEnum.Pending)).toBe(1);
  expect(swapStepIndex(SwapStatusEnum.Processing)).toBe(1);
  expect(swapStepIndex(SwapStatusEnum.Completed)).toBe(SWAP_STEP_COUNT);
});

test('Tests that each ending lands on its own result when the swap stops moving', () => {
  expect(swapOutcome(SwapStatusEnum.Completed)).toBe('completed');
  expect(swapOutcome(SwapStatusEnum.Refunded)).toBe('refunded');
  expect(swapOutcome(SwapStatusEnum.IncompleteDeposit)).toBe('incomplete');
  expect(swapOutcome(SwapStatusEnum.Expired)).toBe('expired');
  expect(swapOutcome(SwapStatusEnum.Failed)).toBe('failed');
  expect(swapOutcome(SwapStatusEnum.Processing)).toBe('inFlight');
});

test('Tests that a swap opens on its deposit, its tracking or its detail when tapped by status', () => {
  expect(swapScreenFor(SwapStatusEnum.AwaitingExternalDeposit)).toBe(
    Route.SwapDeposit,
  );
  expect(swapScreenFor(SwapStatusEnum.Pending)).toBe(Route.SwapTracking);
  expect(swapScreenFor(SwapStatusEnum.Completed)).toBe(Route.SwapDetail);
  expect(swapScreenFor(SwapStatusEnum.Refunded)).toBe(Route.SwapDetail);
});

test('Tests that the deposit deadline is the window after creation when the route names no expiry', () => {
  expect(depositDeadlineMs({ createdAtMs: 1_000 })).toBe(
    1_000 + DEPOSIT_WINDOW_MS,
  );
  expect(depositDeadlineMs({ createdAtMs: 1_000, expiresAtMs: 5_000 })).toBe(
    5_000,
  );
});

test('Tests that the countdown reads m:ss and never goes below zero when time runs out', () => {
  expect(countdownText(15 * 60 * 1000)).toBe('15:00');
  expect(countdownText(61_000)).toBe('1:01');
  expect(countdownText(-5_000)).toBe('0:00');
});
