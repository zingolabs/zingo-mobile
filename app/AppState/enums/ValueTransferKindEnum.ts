export enum ValueTransferKindEnum {
  Sent = 'Sent',
  Received = 'Received',
  MemoToSelf = 'MemoToSelf',
  SendToSelf = 'SendToSelf', // like 'basic` in zingolib
  Shield = 'Shield',
  Rejection = 'Rejection',
  // A send-to-self that drains the Orchard pool into Ironwood (NU6.3 migration).
  Migration = 'Migration',
}
