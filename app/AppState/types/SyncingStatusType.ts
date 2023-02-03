export default interface SyncingStatusType {
  inProgress: boolean;
  progress: number;
  blocks: string;
  synced: boolean;
  // eslint-disable-next-line semi
}
