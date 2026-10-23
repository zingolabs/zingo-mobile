import RPCModule from '@app/RPCModule';

const STOP_POLL_MS = 200;
const STOP_WAIT_MS = 30 * 1000;

let spendsInFlight = 0;

/**
 * True while a spend runs with the engine stopped. The sync tick must not
 * launch a session then, or the spend would race it again.
 */
export function spendInFlight(): boolean {
  return spendsInFlight > 0;
}

/**
 * Runs a spend with the sync engine stopped and ended, as zingo-pc does.
 *
 * A continuous engine re-enters its outer loop on every block, and that loop
 * updates the note commitment trees in separate lock takes that zingolib's
 * pause around a proposal does not cover, so a spend could read a
 * half-updated tree ("Unable to compute root"). Nothing relaunches here: the
 * next tick finds no session and launches one.
 */
export async function withSyncStopped<T>(
  operation: () => Promise<T>,
): Promise<T> {
  spendsInFlight += 1;
  try {
    await stopSyncAndWait(STOP_WAIT_MS, error =>
      console.log(`sync stop before spend: ${error}`),
    );
    return await operation();
  } finally {
    spendsInFlight -= 1;
  }
}

/**
 * Asks the engine to stop after its current batch and polls until it has
 * ended, or until `waitMs` runs out. Stopping when nothing runs is not an
 * error.
 */
export async function stopSyncAndWait(
  waitMs: number,
  onStopError: (error: unknown) => void,
): Promise<void> {
  try {
    await RPCModule.stopSyncProcess();
  } catch (error) {
    onStopError(error);
  }
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    try {
      const poll: string = await RPCModule.pollSyncInfo();
      if (!poll.toLowerCase().startsWith('sync task is not complete')) {
        return;
      }
    } catch (error) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, STOP_POLL_MS));
  }
}
