export type RPCIronwoodDrainType = {
  // The drain transactions, in broadcast order
  txids: string[];
  // Value sent into the Ironwood pool, in zatoshis
  migrated: number;
  // Total fees paid, in zatoshis
  fee: number;
  // Dust value left unmigrated in the Orchard pool, in zatoshis
  dust: number;
};
