export default interface InfoType {
  chain_name: 'main' | 'test' | 'regtest';
  serverUri: string;
  latestBlock: number;
  connections: number;
  version: string;
  verificationProgress: number;
  currencyName: string;
  solps: number;
  zingolib: string;
  // eslint-disable-next-line semi
}
