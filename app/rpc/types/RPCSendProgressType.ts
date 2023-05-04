export type RPCSendProgressType = {
  id: number;
  sending: boolean;
  progress: number;
  total: number;
  txid: string;
  error: string;
  sync_interrupt: boolean;
};
