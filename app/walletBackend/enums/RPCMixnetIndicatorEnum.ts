/**
 * The Mixnet Mode indicator reported by zingolib, where `died` blocks sends until the user re-enables the mixnet.
 *
 * `off` is the deliberate switch-off — the session went Offline, so there is
 * no transport and nothing to recover. It blocks sends like the rest, but it
 * is the one state the app never reconnects out of on its own.
 */
export enum RPCMixnetIndicatorEnum {
  bootstrapping = 'bootstrapping',
  ready = 'ready',
  off = 'off',
  died = 'died',
}
