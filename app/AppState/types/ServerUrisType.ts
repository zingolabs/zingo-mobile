import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';

export default interface ServerUrisType {
  uri: string;
  chainName: ChainNameEnum;
  region: string;
  default: boolean;
  latency: number | null;
  obsolete: boolean;
  // A Zaino server Zingo recommends: shown on the Server screen itself, and
  // the only kind Automatic picks while one of them answers.
  recommended?: boolean;
}
