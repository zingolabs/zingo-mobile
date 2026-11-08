import { pinGlobals } from '@app/utils/pinGlobals';

/**
 * - Redefines every Pinned Global on `globalThis` on the first import of
 *   `index.js`, after `hardenIntrinsics()` and before anything else
 *   evaluates.
 */
pinGlobals();
