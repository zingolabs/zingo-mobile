export enum TransactionActionEnum {
  remove = 'remove',
}

export enum TransactionTypeEnum {
  Sent = 'Sent',
  Received = 'Received',
  MemoToSelf = 'MemoToSelf',
  SendToSelf = 'SendToSelf',
  Shield = 'Shield',
}

export enum ValueTransferKindEnum {
  Sent = 'Sent',
  Received = 'Received',
  MemoToSelf = 'MemoToSelf',
  SendToSelf = 'SendToSelf', // like 'basic` in zingolib
  Shield = 'Shield',
  Rejection = 'Rejection',
  // A send-to-self that drains the Orchard pool into Ironwood (NU6.3 migration).
  Migration = 'Migration',
  // A swap this wallet made, projected from its local record by
  // `swapRecordToValueTransfer`. zingolib reports none of these.
  Swap = 'Swap',
}

export enum PoolEnum {
  IronwoodPool = 'Ironwood',
  OrchardPool = 'Orchard',
  SaplingPool = 'Sapling',
  TransparentPool = 'Transparent',
}

export enum PoolToShieldEnum {
  noPoolToShield = '',
  allPoolToShield = 'all',
  transparentPoolToShield = 'transparent',
  saplingPoolToShield = 'sapling',
}

export enum FilterEnum {
  all = 'all',
  contacts = 'contacts',
  noContacts = 'no contacts',
  withFunds = 'withFunds',
  wallet = 'wallet',
  // new ones - kind
  sent = 'sent',
  received = 'received',
  shielded = 'shielded',
  swaps = 'swaps',
  // new one - Status
  failed = 'failed',
  // new one
  memos = 'memos',
}

export enum ReceiverEnum {
  o = 'o',
  z = 'z',
  t = 't',
}

export enum AddressKindEnum {
  u = 'u',
  t = 't',
}

export enum AddressUnifiedTypeEnum {
  orchard = 'orchard',
  orchardAndSapling = 'orchard+sapling',
  sapling = 'sapling',
}

export enum RestoreFromTypeEnum {
  seedRestoreFrom = 'seed',
  ufvkRestoreFrom = 'ufvk',
}
