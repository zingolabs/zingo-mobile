import { RPCWalletKindEnum } from '@app/walletBackend/enums/RPCWalletKindEnum';

export type RPCWalletKindType = {
  kind: RPCWalletKindEnum;
  transparent: boolean;
  sapling: boolean;
  orchard: boolean;
};
