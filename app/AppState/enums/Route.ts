// Every route of the app, by name. The tree in app/navigation declares
// which navigator holds each one; the param lists in app/types say what it
// carries.
export const Route = {
  // Root sections
  Loading: 'Loading',
  Wallet: 'Wallet',

  // Loading section
  Boot: 'Boot',
  Lock: 'Lock',
  Onboarding: 'Onboarding',

  // Onboarding screens
  Welcome: 'Welcome',
  ImportChooser: 'ImportChooser',
  ImportWallet: 'ImportWallet',
  Progress: 'Progress',
  OpenError: 'OpenError',
  Server: 'Server',
  ServerList: 'ServerList',

  // Drawer no params
  Home: 'Home',
  History: 'History',
  Send: 'Send',
  Receive: 'Receive',
  Swap: 'Swap',
  SwapReview: 'SwapReview',
  SwapDeposit: 'SwapDeposit',
  SwapTracking: 'SwapTracking',
  SwapResult: 'SwapResult',
  SwapDetail: 'SwapDetail',
  Messages: 'Messages',
  Settings: 'Settings',
  About: 'About',
  MixnetDoctor: 'MixnetDoctor',
  Insight: 'Insight',
  Computing: 'Computing',
  SyncReport: 'SyncReport',
  Pools: 'Pools',
  MeetIronwood: 'MeetIronwood',
  SeedBackup: 'SeedBackup',
  WalletSeed: 'WalletSeed',
  ViewingKey: 'ViewingKey',
  MigrationStrategy: 'MigrationStrategy',
  MigrationTransactions: 'MigrationTransactions',
  MigrationSending: 'MigrationSending',
  MigrationSplitPlan: 'MigrationSplitPlan',
  MigrationSplitting: 'MigrationSplitting',
  MigrationCadence: 'MigrationCadence',
  MigrationSchedule: 'MigrationSchedule',
  MigrationStatus: 'MigrationStatus',
  MigrationBatchSending: 'MigrationBatchSending',

  // Drawer with params
  AddressBook: 'AddressBook',
  AddressList: 'AddressList',
  Scanner: 'Scanner',
  ValueTransferDetail: 'ValueTransferDetail',
  Confirm: 'Confirm',
} as const;

export type Route = (typeof Route)[keyof typeof Route];
