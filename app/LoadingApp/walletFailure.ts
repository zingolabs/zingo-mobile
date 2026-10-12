import { RouteEnum } from '@app/AppState/enums/RouteEnum';
import { InitStep, WalletErrorInfo } from '@app/AppState/types/WalletErrorInfo';
import { sanitizePaths } from '@app/utils/sanitizePaths';
import { walletErrorKind } from './walletErrorKind';

export type InitOutcome =
  | { kind: 'screen'; error: WalletErrorInfo }
  | { kind: 'alert'; origin: RouteEnum; labelKey: string; error: string };

export type Retry = { kind: 'open' } | InitStep;

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

// A failure naming the connection lands on the error screen with its step
// kept for the retry. Any other failure keeps the alert.
export const initOutcome = (step: InitStep, errorText: string): InitOutcome =>
  walletErrorKind(errorText) === 'server'
    ? {
        kind: 'screen',
        error: { kind: 'init', details: sanitizePaths(errorText), step },
      }
    : {
        kind: 'alert',
        origin: initOrigin(step),
        labelKey: initLabelKey(step),
        error: errorText,
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
