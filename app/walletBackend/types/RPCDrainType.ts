// The summary returned by zingolib's `drain_orchard_to_ironwood` after the
// drain transactions are built and broadcast. Values are in zatoshis.
export type RPCDrainType = {
  txids?: string[];
  migrated?: number;
  fee?: number;
  residual?: number;
  error?: string;
};
