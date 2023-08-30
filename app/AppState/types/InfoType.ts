export default interface InfoType {
  chain_name: 'main' | 'test' | 'regtest';
  serverUri: string;
  latestBlock: number;
  connections: number;
  version: string;
  verificationProgress: number;
  currencyName: string;
  solps: number;
  defaultFee: number; // here is a float number, like 0.0001
  zingolib: string;
  // eslint-disable-next-line semi
}
