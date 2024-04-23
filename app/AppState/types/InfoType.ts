import { ChainNameEnum } from '../enums/ChainNameEnum';

export default interface InfoType {
  chain_name: ChainNameEnum;
  serverUri: string;
  latestBlock: number;
  connections: number;
  version: string;
  verificationProgress: number;
  currencyName: string;
  solps: number;
  zingolib: string;
  // eslint-disable-next-line semi
}
