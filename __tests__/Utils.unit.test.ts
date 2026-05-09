/**
 * @format
 */

jest.mock('../app/RPCModule', () => ({
  default: {
    parseAddressInfo: jest.fn(),
    getDonationAddress: jest.fn(),
    getZenniesDonationAddress: jest.fn(),
  },
}));

import Utils from '../app/utils/Utils';
import {
  BlockExplorerEnum,
  ChainNameEnum,
  ContactType,
  GlobalConst,
  LanguageEnum,
} from '../app/AppState';

// react-native-localize mock returns decimalSeparator: '.'

describe('Utils.trimToSmall', () => {
  test('returns empty string for undefined', () => {
    expect(Utils.trimToSmall(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(Utils.trimToSmall('')).toBe('');
  });

  test('uses default trimSize of 5', () => {
    expect(Utils.trimToSmall('abcdefghijklmnop')).toBe('abcde...lmnop');
  });

  test('uses custom trimSize', () => {
    expect(Utils.trimToSmall('abcdefghij', 3)).toBe('abc...hij');
  });
});

describe('Utils.splitStringIntoChunks', () => {
  test('returns input as single chunk if string is shorter than 16 chars', () => {
    expect(Utils.splitStringIntoChunks('short', 3)).toEqual(['short']);
  });

  test('returns input as single chunk if numChunks exceeds length', () => {
    expect(Utils.splitStringIntoChunks('ab', 10)).toEqual(['ab']);
  });

  test('splits a 16-char string into 2 equal chunks', () => {
    const result = Utils.splitStringIntoChunks('abcdefghijklmnop', 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('abcdefgh');
    expect(result[1]).toBe('ijklmnop');
  });

  test('last chunk absorbs remainder', () => {
    // 17 chars / 2 chunks → chunkSize=9 → first='abcdefghi', last='jklmnopq'
    const result = Utils.splitStringIntoChunks('abcdefghijklmnopq', 2);
    expect(result[0] + result[1]).toBe('abcdefghijklmnopq');
  });
});

describe('Utils.utf16Split', () => {
  test('splits ASCII string by byte limit', () => {
    expect(Utils.utf16Split('hello world', 5)).toEqual(['hello', ' worl', 'd']);
  });

  test('keeps single chunk when string fits', () => {
    expect(Utils.utf16Split('hi', 10)).toEqual(['hi']);
  });

  test('returns empty array for empty string', () => {
    expect(Utils.utf16Split('', 5)).toEqual([]);
  });

  test('handles emoji (4-byte chars) correctly', () => {
    // Each emoji counts as 4 bytes; chunksize 4 fits exactly one emoji
    const result = Utils.utf16Split('😀😀', 4);
    expect(result).toHaveLength(2);
  });
});

describe('Utils.parseNumberFloatToStringLocale', () => {
  test('converts number to locale string with given decimal places', () => {
    expect(Utils.parseNumberFloatToStringLocale(1.5, 2)).toBe('1.50');
  });

  test('rounds to specified fixed places', () => {
    expect(Utils.parseNumberFloatToStringLocale(1.23456789, 4)).toBe('1.2346');
  });

  test('handles zero', () => {
    expect(Utils.parseNumberFloatToStringLocale(0, 8)).toBe('0.00000000');
  });
});

describe('Utils.parseStringLocaleToNumberFloat', () => {
  test('converts locale string to number', () => {
    expect(Utils.parseStringLocaleToNumberFloat('1.5')).toBe(1.5);
  });

  test('handles zero string', () => {
    expect(Utils.parseStringLocaleToNumberFloat('0.00')).toBe(0);
  });

  test('handles integer string', () => {
    expect(Utils.parseStringLocaleToNumberFloat('42')).toBe(42);
  });
});

describe('Utils.splitZecAmountIntoBigSmall', () => {
  test('returns placeholder for undefined', () => {
    expect(Utils.splitZecAmountIntoBigSmall(undefined)).toEqual({
      bigPart: '--',
      smallPart: '',
    });
  });

  test('splits 8-decimal amount correctly (truncates, does not round)', () => {
    const result = Utils.splitZecAmountIntoBigSmall(1.23456789);
    expect(result.bigPart).toBe('1.2345');
    expect(result.smallPart).toBe('6789');
  });

  test('trims trailing zeros when sub-decimal part is all zeros', () => {
    const result = Utils.splitZecAmountIntoBigSmall(1.0);
    expect(result.bigPart).toBe('1');
    expect(result.smallPart).toBe('0000');
  });

  test('handles zero', () => {
    const result = Utils.splitZecAmountIntoBigSmall(0);
    expect(result.bigPart).toBe('0');
    expect(result.smallPart).toBe('0000');
  });
});

describe('Utils.getBlockExplorerTxIDURL', () => {
  const txid = 'abc123';

  test('Zcashexplorer mainnet', () => {
    expect(
      Utils.getBlockExplorerTxIDURL(
        txid,
        ChainNameEnum.mainChainName,
        BlockExplorerEnum.Zcashexplorer,
      ),
    ).toBe(`https://mainnet.zcashexplorer.app/transactions/${txid}`);
  });

  test('Zcashexplorer testnet', () => {
    expect(
      Utils.getBlockExplorerTxIDURL(
        txid,
        ChainNameEnum.testChainName,
        BlockExplorerEnum.Zcashexplorer,
      ),
    ).toBe(`https://testnet.zcashexplorer.app/transactions/${txid}`);
  });

  test('Cipherscan mainnet', () => {
    expect(
      Utils.getBlockExplorerTxIDURL(
        txid,
        ChainNameEnum.mainChainName,
        BlockExplorerEnum.Cipherscan,
      ),
    ).toBe(`https://cipherscan.app/tx/${txid}`);
  });

  test('Cipherscan testnet', () => {
    expect(
      Utils.getBlockExplorerTxIDURL(
        txid,
        ChainNameEnum.testChainName,
        BlockExplorerEnum.Cipherscan,
      ),
    ).toBe(`https://testnet.cipherscan.app/tx/${txid}`);
  });

  test('Zypherscan mainnet', () => {
    expect(
      Utils.getBlockExplorerTxIDURL(
        txid,
        ChainNameEnum.mainChainName,
        BlockExplorerEnum.Zypherscan,
      ),
    ).toBe(`https://www.zypherscan.com/tx/${txid}`);
  });

  test('Zypherscan testnet', () => {
    expect(
      Utils.getBlockExplorerTxIDURL(
        txid,
        ChainNameEnum.testChainName,
        BlockExplorerEnum.Zypherscan,
      ),
    ).toBe(`https://testnet.zypherscan.com/tx/${txid}`);
  });

  test('unknown explorer returns empty string', () => {
    expect(
      Utils.getBlockExplorerTxIDURL(
        txid,
        ChainNameEnum.mainChainName,
        'unknown' as BlockExplorerEnum,
      ),
    ).toBe('');
  });
});

describe('Utils.getLabelColor', () => {
  test('returns black for white background', () => {
    expect(Utils.getLabelColor('#FFFFFF')).toBe('#000000');
  });

  test('returns white for black background', () => {
    expect(Utils.getLabelColor('#000000')).toBe('#FFFFFF');
  });

  test('works without leading hash', () => {
    expect(Utils.getLabelColor('FFFFFF')).toBe('#000000');
  });

  test('returns black for bright yellow', () => {
    expect(Utils.getLabelColor('#FFFF00')).toBe('#000000');
  });

  test('returns white for dark blue', () => {
    expect(Utils.getLabelColor('#00008B')).toBe('#FFFFFF');
  });
});

describe('Utils.formatDate', () => {
  test('formats timestamp in English', () => {
    // 2024-01-15 12:00:00 UTC
    const ts = new Date('2024-01-15T12:00:00Z').getTime();
    const result = Utils.formatDate(ts, 'yyyy-MM-dd', LanguageEnum.en);
    expect(result).toBe('2024-01-15');
  });

  test('formats with locale-specific month name in Spanish', () => {
    const ts = new Date('2024-01-15T12:00:00Z').getTime();
    const result = Utils.formatDate(ts, 'MMMM', LanguageEnum.es);
    expect(result.toLowerCase()).toMatch(/enero/);
  });

  test('formats with locale-specific month name in Portuguese', () => {
    const ts = new Date('2024-01-15T12:00:00Z').getTime();
    const result = Utils.formatDate(ts, 'MMMM', LanguageEnum.pt);
    expect(result.toLowerCase()).toMatch(/janeiro/);
  });
});

describe('Utils.diffInMinutes', () => {
  test('calculates difference between two dates', () => {
    const from = new Date('2024-01-01T10:00:00Z');
    const to = new Date('2024-01-01T10:30:00Z');
    expect(Utils.diffInMinutes(to, from)).toBe(30);
  });

  test('returns 0 for same date', () => {
    const d = new Date('2024-01-01T10:00:00Z');
    expect(Utils.diffInMinutes(d, d)).toBe(0);
  });

  test('returns negative for reversed order', () => {
    const from = new Date('2024-01-01T10:00:00Z');
    const to = new Date('2024-01-01T10:30:00Z');
    expect(Utils.diffInMinutes(from, to)).toBe(-30);
  });
});

describe('Utils.splitMemo', () => {
  test('returns empty memo and memoUA for empty array', () => {
    expect(Utils.splitMemo([])).toEqual({ memo: '', memoUA: '' });
  });

  test('returns memo with no memoUA when no replyTo marker', () => {
    expect(Utils.splitMemo(['hello world'])).toEqual({
      memo: 'hello world',
      memoUA: '',
    });
  });

  test('splits memo and memoUA on replyTo marker', () => {
    const memoUA = 'u1abc123';
    const memos = [`hello${GlobalConst.replyTo}${memoUA}`];
    const result = Utils.splitMemo(memos);
    expect(result.memo).toBe('hello');
    expect(result.memoUA).toBe(memoUA);
  });

  test('joins multiple memos with newline before splitting', () => {
    const result = Utils.splitMemo(['line1', 'line2']);
    expect(result.memo).toBe('line1\nline2');
    expect(result.memoUA).toBe('');
  });

  test('returns empty for undefined', () => {
    expect(Utils.splitMemo(undefined)).toEqual({ memo: '', memoUA: '' });
  });
});

describe('Utils.buildMemo', () => {
  test('builds memo without UA when includeUAMemo is false', () => {
    expect(Utils.buildMemo('hello', false, 'u1abc')).toBe('hello');
  });

  test('appends replyTo and UA when includeUAMemo is true', () => {
    const result = Utils.buildMemo('hello', true, 'u1abc');
    expect(result).toBe(`hello${GlobalConst.replyTo}u1abc`);
  });

  test('handles undefined memo', () => {
    expect(Utils.buildMemo(undefined, false, 'u1abc')).toBe('');
  });

  test('handles undefined memo with UA', () => {
    const result = Utils.buildMemo(undefined, true, 'u1abc');
    expect(result).toBe(`${GlobalConst.replyTo}u1abc`);
  });
});

describe('Utils.countMemoBytes', () => {
  test('counts ASCII bytes correctly', () => {
    expect(Utils.countMemoBytes('hello', false, '')).toBe(5);
  });

  test('includes UA bytes when includeUAMemo is true', () => {
    const ua = 'u1abc';
    const expected = Buffer.byteLength(
      `hello${GlobalConst.replyTo}${ua}`,
      'utf8',
    );
    expect(Utils.countMemoBytes('hello', true, ua)).toBe(expected);
  });

  test('returns 0 for empty memo without UA', () => {
    expect(Utils.countMemoBytes(undefined, false, '')).toBe(0);
  });
});

const minimalContact = (address: string, memos: string[]): ContactType => ({
  address,
  memos,
  label: '',
  color: '',
  time: 0,
  confirmations: 0,
});

describe('Utils.isMessagesAddress', () => {
  test('returns true for non-transparent address', () => {
    expect(Utils.isMessagesAddress(minimalContact('u1abc123', []))).toBe(true);
  });

  test('returns false for transparent address', () => {
    expect(Utils.isMessagesAddress(minimalContact('t1abc123', []))).toBe(false);
  });

  test('returns true when address is empty but memoUA exists', () => {
    const memos = [`hello${GlobalConst.replyTo}u1abc`];
    expect(Utils.isMessagesAddress(minimalContact('', memos))).toBe(true);
  });

  test('returns false when no address and no memoUA', () => {
    expect(Utils.isMessagesAddress(minimalContact('', ['hello']))).toBe(false);
  });
});
