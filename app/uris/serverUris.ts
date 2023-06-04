import { ServerType } from '../AppState';

const serverUris = (): ServerType[] => {
  return [
    {
      uri: 'https://mainnet.lightwalletd.com:9067',
      chain_name: 'main',
    },
    {
      uri: 'https://lwdv3.zecwallet.co:443',
      chain_name: 'main',
    },
  ];
};

export default serverUris;
