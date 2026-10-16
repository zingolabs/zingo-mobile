import { pinGlobals } from '@app/utils/pinGlobals';

/**
 * First import of index.js: InitializeCore has run and `hardenIntrinsics()`
 * has frozen the language, so the host globals exist and nothing else has
 * evaluated yet.
 */
pinGlobals();
