import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import { fieldBorder } from '@ui/primitives/fieldBorder';

const c = mockTheme.colors;

describe('fieldBorder', () => {
  test('Tests that a field is blue at rest and a lighter blue in focus when its value is unknown', () => {
    expect(fieldBorder(c, false)).toBe(c.bottomSheetBorder);
    expect(fieldBorder(c, true)).toBe(c.borderFocus);
  });

  test('Tests that validity wins over focus when the value is known', () => {
    expect(fieldBorder(c, true, 'valid')).toBe(c.borderAccent);
    expect(fieldBorder(c, true, 'invalid')).toBe(c.borderDanger);
    expect(fieldBorder(c, false, 'invalid')).toBe(c.borderDanger);
  });
});
