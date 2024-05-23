import { ChainNameEnum } from '../enums/ChainNameEnum';

export default interface ServerType {
  uri: string;
  chain_name: ChainNameEnum;

  // eslint-disable-next-line semi
}
