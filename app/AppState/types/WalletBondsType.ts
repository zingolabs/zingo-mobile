import { WalletBondsStatusEnum } from "../enums/WalletBondsStatusEnum";

export default interface WalletBondsType {
  txid: string;
  pubKey: string;
  amount: number;
  status: WalletBondsStatusEnum;
  finalizer: string;
}
