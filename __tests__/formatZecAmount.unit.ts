import 'react-native';
import { formatZecAmount } from '@app/utils/formatZecAmount';
import { transferRowText } from '@screens/History/historyRowText';
import { ValueTransferKindEnum, ValueTransferType } from '@app/AppState';

describe('formatZecAmount', () => {
  test('Tests that a round amount keeps one decimal', () => {
    expect(formatZecAmount(2)).toBe('2.0');
    expect(formatZecAmount(0.1)).toBe('0.1');
  });

  test('Tests that trailing zeros go', () => {
    expect(formatZecAmount(0.1)).toBe('0.1');
    expect(formatZecAmount(1.25)).toBe('1.25');
  });

  test('Tests that an amount from 1 ZEC is cut at 4 decimals, never rounded up', () => {
    expect(formatZecAmount(1.62349999)).toBe('1.6234');
  });

  test('Tests that an amount under 1 ZEC keeps up to 8 decimals', () => {
    expect(formatZecAmount(0.00012345)).toBe('0.00012345');
  });

  test('Tests that nothing reads as 0.0', () => {
    expect(formatZecAmount(0)).toBe('0.0');
  });
});

describe('transferRowText title', () => {
  const t = (key: string) => key;
  const sent = {
    kind: ValueTransferKindEnum.Sent,
    address: 'u1abcdefghijklmnopqrstuvwxyz0123456789',
    amount: 0.1,
    confirmations: 10,
    status: 'confirmed',
  } as unknown as ValueTransferType;

  test('Tests that a sent row reads the contact name when the address is a contact', () => {
    const row = transferRowText({
      vt: sent,
      when: 'now',
      currency: 'ZEC',
      usd: '',
      t,
      contactName: 'Irene',
    });
    expect(row.title).toBe('Irene');
    expect(row.titleMono).toBe(false);
  });

  test('Tests that a sent row reads the short address when it is no contact', () => {
    const row = transferRowText({
      vt: sent,
      when: 'now',
      currency: 'ZEC',
      usd: '',
      t,
    });
    expect(row.title).toBe('u1abcd…456789');
    expect(row.top).toBe('−0.1 ZEC');
  });
});
