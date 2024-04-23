import { PoolEnum } from '../enums/PoolEnum';

export default interface TxDetailType {
  address: string;
  amount: number;
  memos?: string[];
  pool?: PoolEnum;
  // eslint-disable-next-line semi
}
