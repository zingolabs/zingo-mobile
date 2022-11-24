export interface InfoType {
  chain_name: string;
  serverUri: string;
  latestBlock: number;
  connections: number;
  version: string;
  verificationProgress: number;
  currencyName: string;
  solps: number;
  zecPrice: number | null;
  defaultFee: number;
}
