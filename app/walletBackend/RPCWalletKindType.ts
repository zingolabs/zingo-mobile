import { RPCWalletKindEnum } from '@app/walletBackend/RPCWalletKindEnum';

export type RPCWalletKindType = {
  kind: RPCWalletKindEnum;
  transparent: boolean;
  sapling: boolean;
  orchard: boolean;
};
