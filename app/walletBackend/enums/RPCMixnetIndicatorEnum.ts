/**
 * The Mixnet Mode indicator reported by zingolib: `off` is the user's deliberate
 * per-session clearnet consent, `bootstrapping` is enabled-but-not-yet-
 * reachable, `ready` carries the send and price surfaces over the mixnet,
 * and `died` is an unconsented proxy loss — sends refuse until the user
 * re-enables the mixnet.
 */
export enum RPCMixnetIndicatorEnum {
  off = 'off',
  bootstrapping = 'bootstrapping',
  ready = 'ready',
  died = 'died',
}
