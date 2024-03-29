export default interface ServerUrisType {
  uri: string;
  chain_name: 'main' | 'test' | 'regtest';
  region: string;
  default: boolean;
  latency: number | null;

  // eslint-disable-next-line semi
}
