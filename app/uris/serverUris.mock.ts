import { ServerUrisType, TranslateType, ChainNameEnum } from '../AppState';

export * from './serverUris';

const serverUris = (translate: (key: string) => TranslateType | void): ServerUrisType[] => {
  return [
    // default servers (2)
    {
      uri: 'https://zec.rocks:443', // this will be the default server.
      region: translate('settings.usa') as string,
      chainName: ChainNameEnum.mainChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
    {
      uri: 'https://lwd1.zcash-infra.com:9067',
      region: translate('settings.usa') as string,
      chainName: ChainNameEnum.mainChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
    {
      uri: 'https://lwd2.zcash-infra.com:9067',
      region: translate('settings.hk') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: false,
    },
  ];
};

export default serverUris;
