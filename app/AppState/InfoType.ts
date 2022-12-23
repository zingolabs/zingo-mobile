export default interface InfoType {
  chain_name: string;
  serverUri: string;
  latestBlock: number;
  connections: number;
  version: string;
  verificationProgress: number;
  currencyName: string;
  solps: number;
  zecPrice: number;
  defaultFee: number;
  // eslint-disable-next-line semi
}
