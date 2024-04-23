import { DownloadMemosEnum } from '../../AppState';

export type RPCGetOptionType = {
  download_memos?: DownloadMemosEnum;
  transaction_filter_threshold?: string;
};
