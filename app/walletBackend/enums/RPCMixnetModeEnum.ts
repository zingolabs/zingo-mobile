/**
 * The five-state Mixnet Mode, rendered from zingolib's wire mint (ADR
 * 0024): `unattached` is the ground state, no transport and no consent, so
 * sends refuse. `switched_off` is the user's deliberate per-session
 * clearnet consent, the one state that opens the send gate off-mixnet.
 * `bootstrapping` is enabled but not yet reachable. `ready` carries the
 * send and price surfaces over the mixnet. `died` is an unconsented proxy
 * loss, sends refuse until the user re-enables the mixnet.
 *
 * The token values are zingolib's, verbatim. This enum re-declares them
 * only until the typed UniFFI surface lands (zingo-mobile#1236). The
 * retired token `off` is deliberately absent: it conflated absence with
 * consent, and the parser rejects it.
 */
export enum RPCMixnetModeEnum {
  unattached = 'unattached',
  switchedOff = 'switched_off',
  bootstrapping = 'bootstrapping',
  ready = 'ready',
  died = 'died',
}
