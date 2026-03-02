import { CurrencyEnum, LanguageEnum } from '../../app/AppState';
import { BlockExplorerEnum } from '../../app/AppState/enums/BlockExplorerEnum';
import { RPCPerformanceLevelEnum } from '../../app/rpc/enums/RPCPerformanceLevelEnum';

export const mockTranslate = (p: string) => {
  if (p === 'about.copyright') {
    return String([
      '1 text translated line 1',
      '2 text translated line 2',
      '3 text translated line 3',
      '4 text translated line 4',
      '5 text translated line 5',
    ]);
  } else if (p === 'seed.buttontexts') {
    return `{
        "new": ["new"],
        "change": ["change"],
        "server": ["server"],
        "view": ["view"],
        "restore": ["restore"],
        "backup": ["backup"]
      }`;
  } else if (p === 'settings.currencies') {
    return [
      {
        value: '',
        text: 'text no currency',
      },
      {
        value: CurrencyEnum.USDCurrency,
        text: 'text USD',
      },
      {
        value: CurrencyEnum.USDTORCurrency,
        text: 'text USD TOR',
      },
    ];
  } else if (p === 'settings.languages') {
    return [
      {
        value: LanguageEnum.en,
        text: 'text en',
      },
      {
        value: LanguageEnum.es,
        text: 'text es',
      },
      {
        value: LanguageEnum.pt,
        text: 'text pt',
      },
      {
        value: LanguageEnum.ru,
        text: 'text ru',
      },
      {
        value: LanguageEnum.tr,
        text: 'text tr',
      },
    ];
  } else if (p === 'settings.sendalls') {
    return [
      {
        value: true,
        text: 'text true',
      },
      {
        value: false,
        text: 'text false',
      },
    ];
  } else if (p === 'settings.donations') {
    return [
      {
        value: true,
        text: 'text true',
      },
      {
        value: false,
        text: 'text false',
      },
    ];
  } else if (p === 'settings.rescanmenus') {
    return [
      {
        value: true,
        text: 'text true',
      },
      {
        value: false,
        text: 'text false',
      },
    ];
  } else if (p === 'settings.recoverywalletinfoondevices') {
    return [
      {
        value: true,
        text: 'text true',
      },
      {
        value: false,
        text: 'text false',
      },
    ];
  } else if (p === 'settings.performancelevels') {
    return [
      {
        value: RPCPerformanceLevelEnum.High,
        text: 'text high',
      },
      {
        value: RPCPerformanceLevelEnum.Low,
        text: 'text low',
      },
      {
        value: RPCPerformanceLevelEnum.Maximum,
        text: 'text maximum',
      },
      {
        value: RPCPerformanceLevelEnum.Medium,
        text: 'text medium',
      },
    ];
  } else if (p === 'settings.blockexplorers') {
    return [
      {
        value: BlockExplorerEnum.Cipherscan,
        text: 'text Cipherscan',
      },
      {
        value: BlockExplorerEnum.Zcashexplorer,
        text: 'text Zcashexplorer',
      },
      {
        value: BlockExplorerEnum.Zypherscan,
        text: 'text Zypherscan',
      },
    ];
  } else {
    return 'text translated';
  }
};
