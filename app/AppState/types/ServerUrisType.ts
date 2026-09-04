import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

export default interface ServerUrisType {
  uri: string;
  chainName: ChainNameEnum;
  region: string;
  default: boolean;
  latency: number | null;
  obsolete: boolean;
}
