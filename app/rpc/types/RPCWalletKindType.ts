import { RPCWalletKindEnum } from '../enums/RPCWalletKindEnum';

export type RPCWalletKindType = {
  kind: RPCWalletKindEnum;
  transparent?: string;
  sapling?: string;
  orchard?: string;
};
