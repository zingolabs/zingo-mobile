/**
 * A sale's deposit that zingolib holds after its deshield: the deshield went
 * out and the vault payment did not. zingolib keeps the payment in memory
 * for a resume and refuses every new send until it goes, so it lasts until
 * the app restarts.
 *
 * Both of zingolib's cases arrive as the FFI code `SendAfterDeshield`:
 * - `failed`: this send deshielded and its vault payment failed.
 * - `pending`: an earlier send's deposit is held, so this one was refused
 *   before anything went out. It may be another sale's.
 */
export class DepositAfterDeshieldError extends Error {
  constructor(
    message: string,
    readonly kind: 'failed' | 'pending',
    readonly deshieldTxId: string | undefined,
  ) {
    super(message);
    this.name = 'DepositAfterDeshieldError';
  }
}

/** Reads zingolib's message, which names the deshield txid either way. */
export function depositAfterDeshieldError(
  message: string,
): DepositAfterDeshieldError {
  const kind = /waits to resume/i.test(message) ? 'pending' : 'failed';
  const deshieldTxId = message.match(/deshield ([0-9a-f]{64})/i)?.[1];
  return new DepositAfterDeshieldError(message, kind, deshieldTxId);
}

/**
 * The deshield whose vault payment zingolib holds in this session. It
 * stores one proposal at a time, so there is at most one.
 */
let held: string | undefined;

export function holdDeshield(txid: string | undefined): void {
  held = txid;
}

/** Whether zingolib still holds the deposit after this deshield. */
export function heldDeshield(txid: string | undefined): boolean {
  return txid !== undefined && held === txid;
}
