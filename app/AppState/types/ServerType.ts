import { ChainNameEnum } from '../enums/ChainNameEnum';

export default interface ServerType {
  uri: string;
  chainName: ChainNameEnum;

  // eslint-disable-next-line semi
}
