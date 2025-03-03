// i18n-js.js

import { LanguageEnum } from '../app/AppState';

export default () => ({
  __esModule: true,
  I18n: jest.fn().mockImplementation(() => ({
    t: jest.fn(),
    locale: LanguageEnum.en,
  })),
});
