import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { RouteEnum } from '@app/AppState/enums/RouteEnum';
import { InitStep, WalletErrorInfo } from '@app/AppState/types/WalletErrorInfo';
import { FfiResult } from '@app/walletBackend';
import { RPCSeedType } from '@app/walletBackend/types/RPCSeedType';
import { RPCUfvkType } from '@app/walletBackend/types/RPCUfvkType';
import { sanitizePaths } from '@app/utils/sanitizePaths';
import { walletErrorKind } from './walletErrorKind';

export type Step = { kind: 'open' } | InitStep;

// 'switch' moves the server to the wallet's chain and then opens.
export type Retry = Step | { kind: 'switch'; chain: ChainNameEnum };

// What a loader returns in place of touching the screen state; `settle`
// is the one place each variant is applied.
export type LoadOutcome =
  | { kind: 'loaded' }
  | { kind: 'error'; error: WalletErrorInfo }
  | { kind: 'alert'; origin: RouteEnum; labelKey: string; error: string }
  | { kind: 'rejected'; origin: RouteEnum; labelKey: string; errorKey: string }
  | { kind: 'offline' };

export type NativeReply =
  | { kind: 'json'; json: RPCSeedType & RPCUfvkType }
  | { kind: 'chainMismatch'; text: string }
  | { kind: 'failed'; text: string };

export const nativeReply = (result: FfiResult<string>): NativeReply => {
  if (!result.ok) {
    return result.error.code === 'WalletChainMismatch'
      ? { kind: 'chainMismatch', text: result.error.message }
      : { kind: 'failed', text: result.error.message };
  }
  if (!result.value) {
    return { kind: 'failed', text: result.value };
  }
  try {
    const json: RPCSeedType & RPCUfvkType = JSON.parse(result.value);
    return json.error
      ? { kind: 'failed', text: json.error }
      : { kind: 'json', json };
  } catch (e: unknown) {
    return { kind: 'failed', text: e instanceof Error ? e.message : String(e) };
  }
};

export const initOrigin = (step: InitStep): RouteEnum => {
  switch (step.kind) {
    case 'create':
      return RouteEnum.StartMenu;
    case 'restore':
      return step.origin;
  }
};

const initLabelKey = (step: InitStep): string => {
  switch (step.kind) {
    case 'create':
      return 'loadingapp.creatingwallet-label';
    case 'restore':
      return 'loadingapp.readingwallet-label';
  }
};

// An open always lands on the error screen. A create or restore lands
// there only when the failure names the connection, and keeps the alert
// with its report button otherwise.
export const failedOutcome = (step: Step, text: string): LoadOutcome => {
  const details = sanitizePaths(text);
  switch (step.kind) {
    case 'open':
      return { kind: 'error', error: { kind: walletErrorKind(text), details } };
    case 'create':
    case 'restore':
      return walletErrorKind(text) === 'server'
        ? { kind: 'error', error: { kind: 'init', details, step } }
        : {
            kind: 'alert',
            origin: initOrigin(step),
            labelKey: initLabelKey(step),
            error: text,
          };
  }
};

export const retryOf = (error: WalletErrorInfo): Retry => {
  switch (error.kind) {
    case 'init':
      return error.step;
    case 'open':
    case 'server':
    case 'chain':
      return { kind: 'open' };
  }
};

export const againKey = (error: WalletErrorInfo): string => {
  switch (error.kind) {
    case 'open':
      return 'walleterror.still-open';
    case 'server':
    case 'chain':
    case 'init':
      return 'walleterror.still-server';
  }
};
