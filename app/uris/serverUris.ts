import { ServerType } from '../AppState';

const serverUris = (): ServerType[] => {
  return [
    {
      uri: 'https://mainnet.lightwalletd.com:9067',
      chain_name: 'main',
    },
    {
      uri: 'https://lwd1.zcash-infra.com:9067',
      chain_name: 'main',
    },
  ];
};

export default serverUris;
