import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { RouteEnum } from '@app/AppState/enums/RouteEnum';
import {
  Cause,
  InitStep,
  Step,
  WalletErrorInfo,
} from '@app/AppState/types/WalletErrorInfo';
import { FfiErrorCode, FfiResult } from '@app/walletBackend';
import { RPCSeedType } from '@app/walletBackend/types/RPCSeedType';
import { RPCUfvkType } from '@app/walletBackend/types/RPCUfvkType';
import { sanitizePaths } from '@app/utils/sanitizePaths';
import { walletErrorKind } from './walletErrorKind';

/**
 * 'switch' moves the server to the wallet's chain and then opens.
 */
export type Retry = Step | { kind: 'switch'; chain: ChainNameEnum };

/**
 * What a loader returns in place of touching the screen state; `settle`
 * is the one place each variant is applied.
 */
export type LoadOutcome =
  | { kind: 'loaded' }
  | { kind: 'error'; error: WalletErrorInfo }
  | { kind: 'alert'; origin: RouteEnum; labelKey: string; error: string }
  | { kind: 'rejected'; origin: RouteEnum; labelKey: string; errorKey: string }
  | { kind: 'offline' };

/**
 * A native failure: the FFI error code and the message that came with it.
 */
export type Failed = { code: FfiErrorCode; text: string };

export type NativeReply =
  | { kind: 'json'; json: RPCSeedType & RPCUfvkType }
  | ({ kind: 'chainMismatch' } & Failed)
  | ({ kind: 'failed' } & Failed);

export const nativeReply = (result: FfiResult<string>): NativeReply => {
  if (!result.ok) {
    const { code, message: text } = result.error;
    return code === 'WalletChainMismatch'
      ? { kind: 'chainMismatch', code, text }
      : { kind: 'failed', code, text };
  }
  if (!result.value) {
    return { kind: 'failed', code: 'Unknown', text: result.value };
  }
  try {
    const json: RPCSeedType & RPCUfvkType = JSON.parse(result.value);
    return json.error
      ? { kind: 'failed', code: 'Unknown', text: json.error }
      : { kind: 'json', json };
  } catch (e: unknown) {
    return {
      kind: 'failed',
      code: 'Unknown',
      text: e instanceof Error ? e.message : String(e),
    };
  }
};

const CAUSE_BY_CODE: Partial<Record<FfiErrorCode, Cause>> = {
  InitConnection: { kind: 'connection' },
  Indexer: { kind: 'connection' },
  InitKey: { kind: 'key' },
  InvalidInput: { kind: 'key' },
  InitBirthday: { kind: 'birthday' },
  InitWalletFile: { kind: 'file' },
};

/**
 * The code names the cause; the message text decides only when the code
 * says nothing, as the `Init` and `Unknown` codes do.
 */
export const causeOf = (failed: Failed): Cause =>
  CAUSE_BY_CODE[failed.code] ??
  (walletErrorKind(failed.text) === 'server'
    ? { kind: 'connection' }
    : { kind: 'unknown' });

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

/**
 * The causes the screen has something to offer a create or restore: another
 * server, or a retry and a report when the cause is unknown. A key or
 * birthday the form let through is a bug, and a file or chain failure has
 * no fix there: those keep the alert with its report button.
 */
const screenOffers = (cause: Cause): boolean => {
  switch (cause.kind) {
    case 'connection':
    case 'unknown':
      return true;
    case 'key':
    case 'birthday':
    case 'file':
    case 'chain':
      return false;
  }
};

/**
 * An open always lands on the error screen. A create or restore lands
 * there when the screen has a fix to offer, and keeps the alert with its
 * report button otherwise.
 */
export const failedOutcome = (step: Step, failed: Failed): LoadOutcome => {
  const error: WalletErrorInfo = {
    cause: causeOf(failed),
    step,
    details: sanitizePaths(failed.text),
  };
  switch (step.kind) {
    case 'open':
      return { kind: 'error', error };
    case 'create':
    case 'restore':
      return screenOffers(error.cause)
        ? { kind: 'error', error }
        : {
            kind: 'alert',
            origin: initOrigin(step),
            labelKey: initLabelKey(step),
            error: failed.text,
          };
  }
};

export const retryOf = (error: WalletErrorInfo): Retry => error.step;

/**
 * What a retry that failed again says. A chain mismatch says nothing: the
 * title already does.
 */
export type Again = { kind: 'say'; key: string } | { kind: 'quiet' };

export const againOf = ({ cause, step }: WalletErrorInfo): Again => {
  switch (cause.kind) {
    case 'connection':
      return { kind: 'say', key: 'walleterror.still-server' };
    case 'file':
      return { kind: 'say', key: 'walleterror.still-open' };
    case 'key':
    case 'birthday':
    case 'unknown':
      return { kind: 'say', key: `walleterror.still-${step.kind}` };
    case 'chain':
      return { kind: 'quiet' };
  }
};
