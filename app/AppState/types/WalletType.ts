import FullViewvingKeysType from './FullViewingKeysType';

export default interface WalletType {
  seed?: string;
  FullViewingKey?: FullViewvingKeysType;
  birthday: number;

  // eslint-disable-next-line semi
}
