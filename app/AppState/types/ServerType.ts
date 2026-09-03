import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

export default interface ServerType {
  uri: string;
  chainName: ChainNameEnum;
}
