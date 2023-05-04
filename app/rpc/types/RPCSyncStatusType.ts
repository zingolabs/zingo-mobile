export type RPCSyncStatusType = {
  sync_id: number;
  in_progress: boolean;
  last_error: string;
  start_block?: number;
  end_block?: number;
  synced_blocks?: number;
  trial_decryptions_blocks?: number;
  txn_scan_blocks?: number;
  witnesses_updated?: number;
  total_blocks?: number;
  batch_num?: number;
  batch_total?: number;
  sync_interrupt?: boolean;
};
