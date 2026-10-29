import { getZingoName, substituteZingoName } from '@app/utils/ZingoAppData';
import en from '@app/translations/en.json';
import es from '@app/translations/es.json';
import pt from '@app/translations/pt.json';
import ru from '@app/translations/ru.json';
import tr from '@app/translations/tr.json';

/** Every string of a translation file, by its dotted key. */
const strings = (o: object, prefix = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string'
      ? [[`${prefix}${k}`, v] as [string, string]]
      : v && typeof v === 'object' && !Array.isArray(v)
        ? strings(v, `${prefix}${k}.`)
        : [],
  );

const LANGUAGES = { en, es, pt, ru, tr };
/** The texts a screen fills with .replace('{name}', …). */
const SCREEN_FILLED = [
  'history.sent-to',
  'addressbook.added',
  'addressbook.delete-question',
  'addressbook.deleted',
  'addressbook.dup-name',
  'addressbook.dup-address',
  'send.name-your-contact',
  'swap.detail-view-on',
];
const APP_NAMED = [
  'updating.firstlaunchingmessage-title',
  'subject',
  'loadedapp.about',
  'loadedapp.support',
  'history.address-http',
];

describe.each(Object.entries(LANGUAGES))('translations in %s', (_, file) => {
  const byKey = Object.fromEntries(strings(file));

  test('Tests that a text a screen fills keeps {name} and never the app name when translate returns it', () => {
    for (const key of SCREEN_FILLED) {
      const text = substituteZingoName(byKey[key]);
      expect(text).toContain('{name}');
      expect(text).not.toContain(getZingoName());
    }
  });

  test('Tests that a text about the app shows the app name when translate returns it', () => {
    for (const key of APP_NAMED) {
      expect(substituteZingoName(byKey[key])).toContain(getZingoName());
    }
  });
});
