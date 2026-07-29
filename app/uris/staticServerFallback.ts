import { ServerUrisType, TranslateType, ChainNameEnum } from '../AppState';

const staticServerFallback = (
  translate: (key: string) => TranslateType | void,
): ServerUrisType[] => {
  return [
    // default server
    {
      uri: 'https://zec.rocks:443', // this will be the default server.
      region: translate('settings.usa') as string,
      chainName: ChainNameEnum.mainChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
    // new servers (not default)
    {
      uri: 'https://na.zec.rocks:443',
      region: translate('settings.na') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: false,
    },
    {
      uri: 'https://sa.zec.rocks:443',
      region: translate('settings.sa') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: false,
    },
    {
      uri: 'https://eu.zec.rocks:443',
      region: translate('settings.ea') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: false,
    },
    // obsolete servers
    {
      uri: 'https://lwd1.zcash-infra.com:9067',
      region: translate('settings.usa') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://ap.zec.rocks:443',
      region: translate('settings.ao') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: false,
    },
    {
      uri: 'https://lwd2.zcash-infra.com:9067',
      region: translate('settings.hk') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://lwd3.zcash-infra.com:9067',
      region: translate('settings.usa') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://lwd4.zcash-infra.com:9067',
      region: translate('settings.canada') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://lwd5.zcash-infra.com:9067',
      region: translate('settings.france') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://lwd6.zcash-infra.com:9067',
      region: translate('settings.usa') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://lwd7.zcash-infra.com:9067',
      region: translate('settings.netherlands') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://lwd8.zcash-infra.com:9067',
      region: translate('settings.uk') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://mainnet.lightwalletd.com:9067',
      region: translate('settings.na') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://na.lightwalletd.com:443',
      region: translate('settings.na') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://sa.lightwalletd.com:443',
      region: translate('settings.sa') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://eu.lightwalletd.com:443',
      region: translate('settings.ea') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    {
      uri: 'https://ai.lightwalletd.com:443',
      region: translate('settings.ao') as string,
      chainName: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
      obsolete: true,
    },
    // testnet default (1)
    {
      uri: 'https://testnet.zec.rocks:443',
      region: '',
      chainName: ChainNameEnum.testChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
  ];
};

export default staticServerFallback;
