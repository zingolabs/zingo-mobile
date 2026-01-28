export enum ValueTransferKindEnum {
  Sent = 'Sent',
  Received = 'Received',
  MemoToSelf = 'MemoToSelf',
  SendToSelf = 'SendToSelf',
  Shield = 'Shield',
  Rejection = 'Rejection',

  // new for staking
  CreateBond = 'CreateBond',
  beginUnbond = 'BeginUnbond',
  WithdrawBond  = 'WithdrawBond',
  RetargetDelegationBond = 'RetargetDelegationBond',

  // error
  Unknown = 'Unknown',
}
