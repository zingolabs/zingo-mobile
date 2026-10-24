import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import RPCModule from '@app/RPCModule';

const hints: Partial<Record<ChainNameEnum, string>> = {
  [ChainNameEnum.mainChainName]: 'main',
  [ChainNameEnum.testChainName]: 'test',
  [ChainNameEnum.regtestChainName]: 'regtest',
};

const known = new Map<ChainNameEnum, string | null>();

export const loadDefaultIndexer = async (
  chain: ChainNameEnum,
): Promise<string | null> => {
  const hint = hints[chain];
  if (!hint) {
    return null;
  }
  const kept = known.get(chain);
  if (kept !== undefined) {
    return kept;
  }
  const uri = (await RPCModule.defaultIndexerInfo(hint)) || null;
  known.set(chain, uri);
  return uri;
};

export const defaultIndexer = (chain: ChainNameEnum): string | null =>
  known.get(chain) ?? null;
