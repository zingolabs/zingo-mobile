import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import ServerType from '@app/AppState/types/ServerType';
import { WalletErrorInfo } from '@app/AppState/types/WalletErrorInfo';

export type Text =
  | { kind: 'plain'; key: string }
  | { kind: 'host'; key: string; host: string }
  | { kind: 'nets'; key: string; net: ChainNameEnum; server: ChainNameEnum };

// What the screen hands back; the host decides what each one runs.
export type ErrorAction =
  | { kind: 'retry' }
  | { kind: 'chain'; chain: ChainNameEnum }
  | { kind: 'import' }
  | { kind: 'create' }
  | { kind: 'back' }
  | { kind: 'server' }
  | { kind: 'report'; subject: string };

// 'more' opens the sheet that holds Import and Create; the screen owns it.
export type LinkAction = ErrorAction | { kind: 'more'; chain: ChainNameEnum };

export type Button = { label: Text; action: LinkAction; testID: string };
export type Link = Button & { size: number };
export type Slot = { kind: 'none' } | { kind: 'link'; link: Link };
export type Badge = { kind: 'bang' } | { kind: 'net'; chain: ChainNameEnum };
export type Chips =
  | { kind: 'none' }
  | { kind: 'nets'; wallet: ChainNameEnum; server: ChainNameEnum };

export type ErrorScreen = {
  icon: 'wallet' | 'server';
  title: Text;
  sub: Text;
  badge: Badge;
  chips: Chips;
  primary: Button;
  top: Slot;
  bottom: Slot;
};

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

const slot = (
  key: string,
  action: LinkAction,
  testID: string,
  size: number,
): Slot => ({
  kind: 'link',
  link: { label: plain(key), action, testID, size },
});

const none: Slot = { kind: 'none' };

// Import and Create for a wallet on disk, around the primary button.
const diskLinks = {
  top: slot('walleterror.import', { kind: 'import' }, 'walleterror.import', 14),
  bottom: slot(
    'walleterror.create',
    { kind: 'create' },
    'walleterror.create',
    13.5,
  ),
};

export const errorScreen = (
  error: WalletErrorInfo,
  server: ServerType,
): ErrorScreen => {
  switch (error.kind) {
    case 'open':
      return {
        icon: 'wallet',
        title: plain('walleterror.open-title'),
        sub: plain('walleterror.open-sub'),
        badge: { kind: 'bang' },
        chips: { kind: 'none' },
        primary: {
          label: plain('walleterror.open'),
          action: { kind: 'retry' },
          testID: 'walleterror.open',
        },
        ...diskLinks,
      };
    case 'server':
      return {
        icon: 'server',
        title: host('walleterror.server-title', server),
        sub: host('walleterror.server-sub', server),
        badge: { kind: 'bang' },
        chips: { kind: 'none' },
        primary: {
          label: plain('walleterror.open'),
          action: { kind: 'retry' },
          testID: 'walleterror.open',
        },
        ...diskLinks,
      };
    case 'init':
      return {
        icon: 'server',
        title: host('walleterror.server-title', server),
        sub: host('walleterror.server-sub', server),
        badge: { kind: 'bang' },
        chips: { kind: 'none' },
        primary: {
          label: plain('walleterror.retry'),
          action: { kind: 'retry' },
          testID: 'walleterror.retry',
        },
        top: none,
        bottom: slot(
          'walleterror.back',
          { kind: 'back' },
          'walleterror.back',
          13.5,
        ),
      };
    case 'chain':
      return {
        icon: 'wallet',
        title: nets(
          'walleterror.chain-title',
          error.walletChain,
          server.chainName,
        ),
        sub: nets('walleterror.chain-sub', error.walletChain, server.chainName),
        badge: { kind: 'net', chain: error.walletChain },
        chips: {
          kind: 'nets',
          wallet: error.walletChain,
          server: server.chainName,
        },
        primary: {
          label: nets(
            'walleterror.chain-action',
            error.walletChain,
            server.chainName,
          ),
          action: { kind: 'chain', chain: error.walletChain },
          testID: 'walleterror.chain',
        },
        top: slot(
          'walleterror.more',
          { kind: 'more', chain: error.walletChain },
          'walleterror.more',
          12.5,
        ),
        bottom: none,
      };
  }
};
