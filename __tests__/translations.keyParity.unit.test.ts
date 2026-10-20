import en from '@app/translations/en.json';
import es from '@app/translations/es.json';
import pt from '@app/translations/pt.json';
import ru from '@app/translations/ru.json';
import tr from '@app/translations/tr.json';

/** Every key a catalog holds, as dotted paths (`info.version`). */
const keysOf = (catalog: object, prefix = ''): string[] =>
  Object.entries(catalog).flatMap(([key, value]) =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const englishKeys = keysOf(en);

const catalogs: Array<[string, object]> = [
  ['es', es],
  ['pt', pt],
  ['ru', ru],
  ['tr', tr],
];

describe('translation catalogs', () => {
  test.each(catalogs)(
    'Tests that %s has every English key when compared with en.json',
    (_lang, catalog) => {
      const keys = new Set(keysOf(catalog));
      expect(englishKeys.filter(key => !keys.has(key))).toEqual([]);
    },
  );
});
