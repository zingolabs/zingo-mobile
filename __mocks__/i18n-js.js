// i18n-js.js

const I18nCtor = jest.fn().mockImplementation((_file) => ({
  t: jest.fn((k) => k),
  locale: 'en',
}));

module.exports = {
  __esModule: true,
  I18n: I18nCtor,   // soporte import nombrado
  default: I18nCtor // soporte import por defecto
};
