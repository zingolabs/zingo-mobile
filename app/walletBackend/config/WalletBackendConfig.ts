import {
  TotalBalanceClass,
  InfoType,
  ValueTransferType,
  UnifiedAddressClass,
  TransparentAddressClass,
  TranslateType,
  ServerType,
} from '../../AppState';
import { RPCSyncStatusType } from '../types/rpcSyncTypes';
import { RPCPerformanceLevelEnum } from '../types/rpcSyncTypes';

export type WalletBackendConfig = {
  readOnly: boolean;
  server: ServerType;
  performanceLevel: RPCPerformanceLevelEnum;
  setTotalBalance: (tb: TotalBalanceClass) => void;
  setValueTransfersList: (list: ValueTransferType[], total: number) => void;
  setMessagesList: (list: ValueTransferType[], total: number) => void;
  setAllAddresses: (
    addrs: (UnifiedAddressClass | TransparentAddressClass)[],
  ) => void;
  setInfo: (info: InfoType) => void;
  setSyncingStatus: (status: RPCSyncStatusType) => void;
  translate: (key: string) => TranslateType;
  keepAwake: (keep: boolean) => void;
  setZingolibVersion: (v: string) => void;
  setBirthday: (b: number) => void;
  setLastError: (e: string) => void;
};
