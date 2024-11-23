export type RPCSendProgressType = {
  id: number;
  sending: boolean;
  progress: number;
  total: number;
  txids: string[];
  error: string | null;
  sync_interrupt: boolean;
};
