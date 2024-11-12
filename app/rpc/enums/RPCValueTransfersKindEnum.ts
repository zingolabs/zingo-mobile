export enum RPCValueTransfersKindEnum {
  sent = 'sent',
  memoToSelf = 'memo-to-self',
  shield = 'shield',
  received = 'received',
  basic = 'basic',
  rejection = 'rejection',

  // obsolete -> same as `basic`.
  //sendToSelf = 'send-to-self',
}
