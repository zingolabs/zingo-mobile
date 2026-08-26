import en from '../app/translations/en.json';
import es from '../app/translations/es.json';
import pt from '../app/translations/pt.json';
import ru from '../app/translations/ru.json';
import tr from '../app/translations/tr.json';

// The split-and-migrate teaser promises privacy. ZIP-318 batching hides
// on-chain linkage, not the sender's network address, so every catalog must
// scope the promise to the chain: an unqualified "more privacy" overclaims.
const chainScope: Array<
  [string, { meetironwood: Record<string, string> }, RegExp]
> = [
  ['en', en, /on-chain/],
  ['es', es, /en la cadena/],
  ['pt', pt, /na cadeia/],
  ['ru', ru, /в блокчейне/],
  ['tr', tr, /zincir üzerinde/],
];

describe('meetironwood.option3-body privacy claim', () => {
  test.each(chainScope)(
    'stays scoped to the chain in %s',
    (_lang, catalog, scope) => {
      expect(catalog.meetironwood['option3-body']).toMatch(scope);
    },
  );
});
