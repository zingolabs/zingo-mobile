import { ChainNameEnum } from '../enums/ChainNameEnum';

export default interface ServerUrisType {
  uri: string;
  chain_name: ChainNameEnum;
  region: string;
  default: boolean;
  latency: number | null;

  // eslint-disable-next-line semi
}
