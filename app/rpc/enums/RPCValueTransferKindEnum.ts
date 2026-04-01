export enum RPCValueTransferKindEnum {
  sent = 'sent',
  memoToSelf = 'memo-to-self',
  shield = 'shield',
  received = 'received',
  sendToSelf = 'send-to-self',
  rejection = 'rejection',

  // new for staking
  createBond = 'create-bond',
  beginUnbond = 'begin-unbond',
  withdrawBond = 'withdraw-bond',
  retargetDelegationBond = 'retarget-delegation-bond',
}
