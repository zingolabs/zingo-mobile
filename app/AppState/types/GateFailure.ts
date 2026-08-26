import { ErrorKeyed } from './Result';

// The gate's error channel carries a catalog key, never prose. `param` is
// the untranslated platform diagnostic (an OSStatus, a prompt code, the
// machine token of the native call that stalled) so a bug report still
// names the mechanism.

/** The translation-catalog keys a gate failure can carry. */
export type GateFailureKey =
  | 'biometrics-failure-stalled'
  | 'biometrics-failure-declined'
  | 'biometrics-failure-notserved'
  | 'biometrics-failure-nosecurity'
  | 'biometrics-failure-away';

/** A gate failure in the repo-canonical ErrorKeyed shape. */
export type GateFailure = ErrorKeyed<GateFailureKey>;
