export default interface ServerType {
  uri: string;
  chain_name: 'main' | 'test' | 'regtest';

  // eslint-disable-next-line semi
}
