/**
 * The Mixnet Mode indicator reported by zingolib, where `died` blocks sends until the user re-enables the mixnet.
 */
export enum RPCMixnetIndicatorEnum {
  bootstrapping = 'bootstrapping',
  ready = 'ready',
  died = 'died',
}
