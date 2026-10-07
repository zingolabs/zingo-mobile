import { LanguageEnum, BlockExplorerEnum } from '@app/AppState';

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
  } else if (p === 'settings.blockexplorers') {
    return [
      {
        value: BlockExplorerEnum.ZecBlock,
        text: 'text ZecBlock',
      },
      {
        value: BlockExplorerEnum.Zcashexplorer,
        text: 'text Zcashexplorer',
      },
      {
        value: BlockExplorerEnum.Zexplorer,
        text: 'text Zexplorer',
      },
      {
        value: BlockExplorerEnum.None,
        text: 'text None',
      },
    ];
  } else {
    return 'text translated';
  }
};
