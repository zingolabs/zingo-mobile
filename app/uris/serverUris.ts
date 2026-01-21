import { ServerUrisType, ChainNameEnum } from '../AppState';

const serverUris = (): ServerUrisType[] => {
  return [
    // default servers (2)
    {
      uri: 'http://45.76.30.90:18233',
      region: 'CrossLink Workshop 1',
      chainName: ChainNameEnum.testChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
    {
      uri: 'http://70.34.201.202:18233',
      region: 'CrossLink Workshop 2',
      chainName: ChainNameEnum.testChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
    {
      uri: 'http://127.0.0.1:18234',
      region: 'CrossLink RegTest',
      chainName: ChainNameEnum.regtestChainName,
      default: true,
      latency: null,
      obsolete: false,
    },
  ];
};

export default serverUris;
