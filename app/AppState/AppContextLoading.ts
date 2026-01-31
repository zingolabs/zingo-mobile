import WalletType from './types/WalletType';
import ZecPriceType from './types/ZecPriceType';
import BackgroundType from './types/BackgroundType';
import { TranslateType } from './types/TranslateType';
import NetInfoType from './types/NetInfoType';
import BackgroundErrorType from './types/BackgroundErrorType';
import ServerType from './types/ServerType';
import SnackbarType from './types/SnackbarType';
import SecurityType from './types/SecurityType';

import { CurrencyEnum } from './enums/CurrencyEnum';
import { LanguageEnum } from './enums/LanguageEnum';
import { ModeEnum } from './enums/ModeEnum';
import { SelectServerEnum } from './enums/SelectServerEnum';
import { ScreenEnum } from './enums/ScreenEnum';
import { RPCPerformanceLevelEnum } from '../rpc/enums/RPCPerformanceLevelEnum';

export default interface AppContextLoading {
  // context
  netInfo: NetInfoType;
  wallet: WalletType;
  zecPrice: ZecPriceType;
  translate: (key: string) => TranslateType;
  backgroundSyncInfo: BackgroundType;
  backgroundError: BackgroundErrorType;
  setBackgroundError: (title: string, error: string) => void;
  readOnly: boolean;
  orchardPool: boolean;
  saplingPool: boolean;
  transparentPool: boolean;
  snackbars: SnackbarType[];
  addLastSnackbar: (snackbar: SnackbarType) => void;
  removeFirstSnackbar: (s: ScreenEnum) => void;
  zingolibVersion: string;
  setPrivacyOption: (value: boolean) => Promise<void>;

  // context settings
  server: ServerType;
  currency: CurrencyEnum;
  language: LanguageEnum;
  sendAll: boolean;
  donation: boolean;
  privacy: boolean;
  mode: ModeEnum;
  security: SecurityType;
  selectServer: SelectServerEnum;
  rescanMenu: boolean;
  recoveryWalletInfoOnDevice: boolean;
  performanceLevel: RPCPerformanceLevelEnum;   
}
