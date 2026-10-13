import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import ServerType from '@app/AppState/types/ServerType';
import { WalletErrorInfo } from '@app/AppState/types/WalletErrorInfo';

export type Text =
  | { kind: 'plain'; key: string }
  | { kind: 'host'; key: string; host: string }
  | { kind: 'nets'; key: string; net: ChainNameEnum; server: ChainNameEnum };

/**
 * What the screen hands back; the host decides what each one runs.
 */
export type ErrorAction =
  | { kind: 'retry' }
  | { kind: 'chain'; chain: ChainNameEnum }
  | { kind: 'import' }
  | { kind: 'create' }
  | { kind: 'back' }
  | { kind: 'server' }
  | { kind: 'report'; subject: string };

/**
 * 'more' opens the sheet that holds Import and Create; the screen owns it.
 */
export type LinkAction = ErrorAction | { kind: 'more'; chain: ChainNameEnum };

export type Button = { label: Text; action: LinkAction; testID: string };
export type Link = Button & { size: number };
export type Slot = { kind: 'none' } | { kind: 'link'; link: Link };
export type Badge = { kind: 'bang' } | { kind: 'net'; chain: ChainNameEnum };
export type Chips =
  | { kind: 'none' }
  | { kind: 'nets'; wallet: ChainNameEnum; server: ChainNameEnum };

/**
 * The head says why it failed; the buttons say what to do about it.
 */
export type Head = {
  icon: 'wallet' | 'server';
  title: Text;
  sub: Text;
  badge: Badge;
  chips: Chips;
};

export type Actions = { primary: Button; top: Slot; bottom: Slot };

export type ErrorScreen = Head & Actions;

const plain = (key: string): Text => ({ kind: 'plain', key });

const hostOf = (server: ServerType): string =>
  server.kind === 'remote' ? server.uri.replace(/^https?:\/\//, '') : '';

const host = (key: string, server: ServerType): Text => ({
  kind: 'host',
  key,
  host: hostOf(server),
});

const nets = (
  key: string,
  net: ChainNameEnum,
  server: ChainNameEnum,
): Text => ({
  kind: 'nets',
  key,
  net,
  server,
});

const button = (key: string, action: LinkAction): Button => ({
  label: plain(key),
  action,
  testID: key,
});

const slot = (key: string, action: LinkAction, size: number): Slot => ({
  kind: 'link',
  link: { ...button(key, action), size },
});

const none: Slot = { kind: 'none' };

const bang = (icon: Head['icon'], title: Text, sub: Text): Head => ({
  icon,
  title,
  sub,
  badge: { kind: 'bang' },
  chips: { kind: 'none' },
});

const head = ({ cause, step }: WalletErrorInfo, server: ServerType): Head => {
  switch (cause.kind) {
    case 'connection':
      return bang(
        'server',
        host('walleterror.server-title', server),
        host('walleterror.server-sub', server),
      );
    case 'file':
      return bang(
        'wallet',
        plain('walleterror.file-title'),
        plain('walleterror.file-sub'),
      );
    case 'key':
    case 'birthday':
    case 'unknown':
      return bang(
        'wallet',
        plain(`walleterror.${step.kind}-title`),
        plain(`walleterror.${step.kind}-sub`),
      );
    case 'chain':
      return {
        icon: 'wallet',
        title: nets(
          'walleterror.chain-title',
          cause.walletChain,
          server.chainName,
        ),
        sub: nets('walleterror.chain-sub', cause.walletChain, server.chainName),
        badge: { kind: 'net', chain: cause.walletChain },
        chips: {
          kind: 'nets',
          wallet: cause.walletChain,
          server: server.chainName,
        },
      };
  }
};

/**
 * A wallet on disk opens again, or is replaced through Import and Create.
 */
const diskActions: Actions = {
  primary: button('walleterror.open', { kind: 'retry' }),
  top: slot('walleterror.import', { kind: 'import' }, 14),
  bottom: slot('walleterror.create', { kind: 'create' }, 13.5),
};

/**
 * A create or restore runs again, or goes back to where it started.
 */
const initActions: Actions = {
  primary: button('walleterror.retry', { kind: 'retry' }),
  top: none,
  bottom: slot('walleterror.back', { kind: 'back' }, 13.5),
};

/**
 * A network mismatch is fixed by a server on the wallet's network; Import
 * and Create wait behind More options, which says they replace the wallet.
 */
const chainActions = (
  server: ServerType,
  walletChain: ChainNameEnum,
): Actions => ({
  primary: {
    label: nets('walleterror.chain-action', walletChain, server.chainName),
    action: { kind: 'chain', chain: walletChain },
    testID: 'walleterror.chain',
  },
  top: slot('walleterror.more', { kind: 'more', chain: walletChain }, 12.5),
  bottom: none,
});

const actions = (error: WalletErrorInfo, server: ServerType): Actions => {
  if (error.cause.kind === 'chain') {
    return chainActions(server, error.cause.walletChain);
  }
  switch (error.step.kind) {
    case 'open':
      return diskActions;
    case 'create':
    case 'restore':
      return initActions;
  }
};

export const errorScreen = (
  error: WalletErrorInfo,
  server: ServerType,
): ErrorScreen => ({
  ...head(error, server),
  ...actions(error, server),
});
