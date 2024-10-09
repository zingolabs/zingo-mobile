import { RPCWalletKindEnum } from '../enums/RPCWalletKindEnum';

export type RPCWalletKindType = {
  kind: RPCWalletKindEnum;
  transparent: boolean;
  sapling: boolean;
  orchard: boolean;
};
