// i18n-js.js

import { LanguageEnum } from '../app/AppState';

export const I18n = {
  t: jest.fn().mockImplementation(key => key),
  locale: LanguageEnum.en,
};
