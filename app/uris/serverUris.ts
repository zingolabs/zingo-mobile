import { ServerUrisType, TranslateType, ChainNameEnum } from '../AppState';

const serverUris = (translate: (key: string) => TranslateType | void): ServerUrisType[] => {
  return [
    // default servers
    {
      uri: 'https://mainnet.lightwalletd.com:9067',
      region: translate('settings.na') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: true,
      latency: null,
    },
    {
      uri: 'https://lwd1.zcash-infra.com:9067',
      region: translate('settings.usa') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: true,
      latency: null,
    },
    // new servers (not default)
    {
      uri: 'https://zec.rocks:443',
      region: translate('settings.usa') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: true,
      latency: null,
    },
    {
      uri: 'https://na.zec.rocks:443',
      region: translate('settings.na') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://sa.zec.rocks:443',
      region: translate('settings.sa') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://eu.zec.rocks:443',
      region: translate('settings.ea') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://ap.zec.rocks:443',
      region: translate('settings.ao') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://na.lightwalletd.com:443',
      region: translate('settings.na') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://sa.lightwalletd.com:443',
      region: translate('settings.sa') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://eu.lightwalletd.com:443',
      region: translate('settings.ea') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://ai.lightwalletd.com:443',
      region: translate('settings.ao') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://lwd2.zcash-infra.com:9067',
      region: translate('settings.hk') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://lwd3.zcash-infra.com:9067',
      region: translate('settings.usa') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://lwd4.zcash-infra.com:9067',
      region: translate('settings.canada') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://lwd5.zcash-infra.com:9067',
      region: translate('settings.france') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://lwd6.zcash-infra.com:9067',
      region: translate('settings.usa') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://lwd7.zcash-infra.com:9067',
      region: translate('settings.netherlands') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
    {
      uri: 'https://lwd8.zcash-infra.com:9067',
      region: translate('settings.uk') as string,
      chain_name: ChainNameEnum.mainChainName,
      default: false,
      latency: null,
    },
  ];
};

export default serverUris;
