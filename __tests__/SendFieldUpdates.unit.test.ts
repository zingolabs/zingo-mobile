/**
 * @format
 */

import {
  applySendFieldUpdates,
  SendFields,
} from '../components/Send/sendFieldUpdates';

const PRICE_USD = 35;

const fields = (overrides: Partial<SendFields> = {}): SendFields => ({
  address: 'u1existingaddress',
  amount: '',
  amountCurrency: '',
  memo: '',
  includeUAMemo: false,
  ...overrides,
});

describe('writing the ZEC amount', () => {
  // REGRESSION EVIDENCE: updateToField used to take five positional slots,
  // with the ZEC and fiat amount slots adjacent and identically typed
  // `string | null`. Expressing "the user typed 2 ZEC" one slot to the
  // right ran the coupling backwards — the form silently held
  // 2 / 35 ≈ 0.057 ZEC (captured: expected '2', received '0.05714286'),
  // and the type system could not object. Under SendFieldUpdate the write
  // names its field, so that transposition is inexpressible: this same
  // scenario now passes by construction.
  test('sets amount to the typed text and computes the fiat counterpart', () => {
    const next = applySendFieldUpdates(
      fields(),
      [{ field: 'amount', value: '2' }],
      PRICE_USD,
    );
    expect(next.amount).toBe('2');
    expect(next.amountCurrency).toBe('70.00');
  });

  test('writing the fiat amount computes the ZEC amount from the price', () => {
    const next = applySendFieldUpdates(
      fields(),
      [{ field: 'amountCurrency', value: '70' }],
      PRICE_USD,
    );
    expect(next.amountCurrency).toBe('70');
    expect(next.amount).toBe('2.00000000');
  });

  test('an unknown price clears the counterpart instead of inventing one', () => {
    const next = applySendFieldUpdates(
      fields(),
      [{ field: 'amount', value: '2' }],
      0,
    );
    expect(next.amount).toBe('2');
    expect(next.amountCurrency).toBe('');
  });

  test('a non-numeric amount clears the counterpart', () => {
    const next = applySendFieldUpdates(
      fields(),
      [{ field: 'amount', value: 'not-a-number' }],
      PRICE_USD,
    );
    expect(next.amount).toBe('not-a-number');
    expect(next.amountCurrency).toBe('');
  });

  test('the two amounts are one value: clearing either clears both', () => {
    const cleared = applySendFieldUpdates(
      fields({ amount: '1.5', amountCurrency: '52.50' }),
      [{ field: 'amount', value: '' }],
      PRICE_USD,
    );
    expect(cleared.amount).toBe('');
    expect(cleared.amountCurrency).toBe('');

    const clearedViaFiat = applySendFieldUpdates(
      fields({ amount: '1.5', amountCurrency: '52.50' }),
      [{ field: 'amountCurrency', value: '' }],
      PRICE_USD,
    );
    expect(clearedViaFiat.amount).toBe('');
    expect(clearedViaFiat.amountCurrency).toBe('');
  });

  test('amounts truncate to their field widths', () => {
    const next = applySendFieldUpdates(
      fields(),
      [{ field: 'amount', value: '1'.repeat(30) }],
      0,
    );
    expect(next.amount).toHaveLength(20);
  });
});

describe('independent fields', () => {
  test('a plain address is stripped of whitespace', () => {
    const next = applySendFieldUpdates(
      fields(),
      [{ field: 'address', value: ' u1a bc\n' }],
      PRICE_USD,
    );
    expect(next.address).toBe('u1abc');
  });

  test('memo and includeUAMemo write without touching the amounts', () => {
    const next = applySendFieldUpdates(
      fields({ amount: '1.5', amountCurrency: '52.50' }),
      [
        { field: 'memo', value: 'hola' },
        { field: 'includeUAMemo', value: true },
      ],
      PRICE_USD,
    );
    expect(next.memo).toBe('hola');
    expect(next.includeUAMemo).toBe(true);
    expect(next.amount).toBe('1.5');
    expect(next.amountCurrency).toBe('52.50');
  });

  test('a batch applies in order (the memo auto-seed pair)', () => {
    const next = applySendFieldUpdates(
      fields(),
      [
        { field: 'amount', value: '0' },
        { field: 'memo', value: 'auto-seeded' },
      ],
      PRICE_USD,
    );
    expect(next.amount).toBe('0');
    expect(next.memo).toBe('auto-seeded');
  });

  test('an empty batch changes nothing', () => {
    const prev = fields({ amount: '1.5', amountCurrency: '52.50' });
    expect(applySendFieldUpdates(prev, [], PRICE_USD)).toEqual(prev);
  });
});
