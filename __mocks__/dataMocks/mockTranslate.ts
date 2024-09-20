import { CurrencyEnum, DownloadMemosEnum, LanguageEnum } from '../../app/AppState';

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
  } else if (p === 'settings.memos') {
    return [
      {
        value: DownloadMemosEnum.noneMemos,
        text: 'text none',
      },
      {
        value: DownloadMemosEnum.walletMemos,
        text: 'text wallet',
      },
      {
        value: DownloadMemosEnum.allMemos,
        text: 'text all',
      },
    ];
  }
  if (p === 'settings.currencies') {
    return [
      {
        value: '',
        text: 'text no currency',
      },
      {
        value: CurrencyEnum.USDCurrency,
        text: 'text USD',
      },
    ];
  }
  if (p === 'settings.languages') {
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
    ];
  }
  if (p === 'settings.sendalls') {
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
  }
  if (p === 'settings.donations') {
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
  }
  if (p === 'settings.rescanmenus') {
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
  } else {
    return 'text translated';
  }
};
