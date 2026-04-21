import { ChainNameEnum } from '../enums/ChainNameEnum';

export default interface ServerType {
  uri: string;
  chainName: ChainNameEnum;
}
