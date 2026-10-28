import {
  depositAfterDeshieldError,
  heldDeshield,
  holdDeshield,
} from '@app/swap/depositAfterDeshield';

const TXID = 'ab'.repeat(32);

test('Tests that a vault payment that failed after this send deshielded reads as failed with its deshield', () => {
  const error = depositAfterDeshieldError(
    `Error: send after deshield: OP_RETURN send failed after the deshield ${TXID} was transmitted. timeout`,
  );
  expect(error.kind).toBe('failed');
  expect(error.deshieldTxId).toBe(TXID);
});

test('Tests that a refusal over a held deposit reads as pending with the held deshield', () => {
  const error = depositAfterDeshieldError(
    `Error: send after deshield: An OP_RETURN send waits to resume after the deshield ${TXID}. Send the stored proposal.`,
  );
  expect(error.kind).toBe('pending');
  expect(error.deshieldTxId).toBe(TXID);
});

test('Tests that only the deshield zingolib holds counts as held when one is held', () => {
  holdDeshield(TXID);
  expect(heldDeshield(TXID)).toBe(true);
  expect(heldDeshield('cd'.repeat(32))).toBe(false);
  expect(heldDeshield(undefined)).toBe(false);
  holdDeshield(undefined);
  expect(heldDeshield(TXID)).toBe(false);
});
