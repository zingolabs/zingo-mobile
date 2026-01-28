export enum ValueTransferKindEnum {
  Sent = 'Sent',
  Received = 'Received',
  MemoToSelf = 'MemoToSelf',
  SendToSelf = 'SendToSelf',
  Shield = 'Shield',
  Rejection = 'Rejection',

  // new for staking
  CreateBond = 'Stake',
  beginUnbond = 'Unstake',
  WithdrawBond = 'Withdraw',
  RetargetDelegationBond = 'Redelegate',

  // error
  Unknown = 'Unknown',
}
