import { hashRowsForRecord } from '@app/swap/hashRowsForRecord';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

const HASH_A =
  'd6c77daacfac04428ab98bd01ec2480e2bb1880ded80d3f370937fedbfd4ddaa';
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const PLACEHOLDER = '0'.repeat(64);

const record = (overrides: Partial<SwapRecordType> = {}): SwapRecordType =>
  overrides as SwapRecordType;

describe('hashRowsForRecord', () => {
  // The warning that found this: an outbound swap broadcasts the transaction
  // the provider then observes, so both fields hold it and the detail view
  // listed it twice — keyed on the hash, so React saw two children with one
  // key.
  it('lists a transaction once even when two fields name it', () => {
    const rows = hashRowsForRecord(
      record({
        observedDepositTxHash: HASH_A,
        broadcast: { txId: HASH_A } as never,
      }),
    );

    expect(rows).toEqual([{ label: 'Deposit', value: HASH_A }]);
  });

  // What a hash is to the swap, before what this wallet did to produce it.
  it('keeps the first name a transaction is given', () => {
    const rows = hashRowsForRecord(
      record({
        destinationTxHash: HASH_A,
        broadcast: { txId: HASH_A } as never,
      }),
    );

    expect(rows.map(r => r.label)).toEqual(['Broadcast']);
  });

  it('lists genuinely different transactions separately', () => {
    const rows = hashRowsForRecord(
      record({
        observedDepositTxHash: HASH_A,
        broadcast: { txId: HASH_B } as never,
        destinationTxHash: HASH_C,
      }),
    );

    expect(rows).toEqual([
      { label: 'Deposit', value: HASH_A },
      { label: 'Broadcast', value: HASH_B },
      { label: 'Destination', value: HASH_C },
    ]);
  });

  // The ZIP 320 two-hop send: the last one pays the vault, the one before it
  // is the indirection getting the funds somewhere that can.
  it('names the last hop the broadcast and numbers the ones before it', () => {
    const rows = hashRowsForRecord(
      record({ broadcast: { allTxIds: [HASH_A, HASH_B] } as never }),
    );

    expect(rows).toEqual([
      { label: 'Broadcast hop 1', value: HASH_A },
      { label: 'Broadcast', value: HASH_B },
    ]);
  });

  // A record written by an older build can hold an all-zero placeholder until
  // the poller rewrites it, and a row for one copies nothing and links
  // nowhere.
  it('leaves out placeholder hashes', () => {
    const rows = hashRowsForRecord(
      record({
        observedDepositTxHash: PLACEHOLDER,
        broadcast: { txId: HASH_A } as never,
      }),
    );

    expect(rows).toEqual([{ label: 'Broadcast', value: HASH_A }]);
  });

  // Last of the list, because it is the one that only exists when the swap
  // did not happen.
  it('lists the transaction that returned the deposit', () => {
    const rows = hashRowsForRecord(
      record({
        observedDepositTxHash: HASH_A,
        refundInfo: { refundTxHash: HASH_B },
      }),
    );

    expect(rows).toEqual([
      { label: 'Deposit', value: HASH_A },
      { label: 'Refund', value: HASH_B },
    ]);
  });

  it('leaves out a placeholder refund hash', () => {
    const rows = hashRowsForRecord(
      record({
        observedDepositTxHash: HASH_A,
        refundInfo: { refundTxHash: PLACEHOLDER },
      }),
    );

    expect(rows).toEqual([{ label: 'Deposit', value: HASH_A }]);
  });

  it('has nothing to show for a swap with no transactions yet', () => {
    expect(hashRowsForRecord(record())).toEqual([]);
  });
});
