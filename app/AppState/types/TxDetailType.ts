import { PoolEnum } from '../enums/PoolEnum';

export default interface TxDetailType {
  address: string;
  amount: number;
  memos?: string[];
  poolType?: PoolEnum;
  // eslint-disable-next-line semi
}
