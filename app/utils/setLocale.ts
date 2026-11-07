import type { I18n } from 'i18n-js';

/**
 * - Mutates the instance's active locale.
 */
export const setLocale = (i18n: I18n, locale: string) => {
  i18n.locale = locale;
};
