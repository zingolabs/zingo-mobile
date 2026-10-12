import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { RestoreFromTypeEnum } from '@app/AppState/enums/RestoreFromTypeEnum';
import { GlobalConst } from '@app/AppState/const/GlobalConst';

export type RestoreInput =
  | {
      kind: 'ok';
      key: string;
      birthday: string;
      from: RestoreFromTypeEnum;
    }
  | { kind: 'rejected'; labelKey: string; errorKey: string };

export const activationHeight: Record<ChainNameEnum, number> = {
  [ChainNameEnum.mainChainName]: 419200,
  [ChainNameEnum.testChainName]: 280000,
  [ChainNameEnum.regtestChainName]: 1,
  [ChainNameEnum.noneChainName]: 1,
};

const rejected = (name: string): RestoreInput => ({
  kind: 'rejected',
  labelKey: `loadingapp.${name}-label`,
  errorKey: `loadingapp.${name}-error`,
});

const ufvkOnChain = (key: string, chain: ChainNameEnum): boolean => {
  switch (chain) {
    case ChainNameEnum.mainChainName:
      return (
        !key.startsWith(GlobalConst.uviewtest) &&
        !key.startsWith(GlobalConst.uviewregtest)
      );
    case ChainNameEnum.testChainName:
      return key.startsWith(GlobalConst.uviewtest);
    case ChainNameEnum.regtestChainName:
      return key.startsWith(GlobalConst.uviewregtest);
    case ChainNameEnum.noneChainName:
      return true;
  }
};

const birthdayText = (birthday: number): string => {
  const parsed = parseInt(birthday.toString(), 10);
  return Number.isNaN(parsed) || parsed < 0 ? '0' : birthday.toString();
};

export const restoreInput = (
  seedUfvk: string,
  birthday: number,
  chain: ChainNameEnum,
): RestoreInput => {
  const key = seedUfvk.toLowerCase();
  if (!key) {
    return rejected('emptyseedufvk');
  }
  const from = key.startsWith(GlobalConst.uview)
    ? RestoreFromTypeEnum.ufvkRestoreFrom
    : RestoreFromTypeEnum.seedRestoreFrom;
  if (
    from === RestoreFromTypeEnum.ufvkRestoreFrom &&
    !ufvkOnChain(key, chain)
  ) {
    return rejected('invalidseedufvk');
  }
  const text = birthdayText(birthday);
  if (Number(text) < activationHeight[chain]) {
    return rejected('invalidbirthday');
  }
  return { kind: 'ok', key, birthday: text, from };
};
