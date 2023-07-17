// i18n-js.js

export const I18n = {
  t: jest.fn().mockImplementation(key => key),
  locale: 'en',
};
