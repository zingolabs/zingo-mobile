/**
 * The jest stand-in for the `zingo-ffi` bindings: the generated error
 * classes, tagged enums and plain enums are the real ones, while every free
 * function, the `Wallet` constructors and `currentWallet` are jest.fn stubs.
 */
import * as generated from '../packages/zingo-ffi/src/generated/zingo';

export const {
  AddressScope,
  BatchPhase,
  BuildPhase,
  Chain,
  JobKind,
  LoadError,
  LoadError_Tags,
  LogLevel,
  MigrationPhase,
  MigrationPhase_Tags,
  MixnetIndicator,
  ParsedAddress,
  ParsedAddress_Tags,
  ParsedViewingKey,
  ParsedViewingKey_Tags,
  PartResult,
  PartResult_Tags,
  PerformanceLevel,
  Pool,
  ReconcileAction,
  ReconcileAction_Tags,
  ScanPriority,
  SplitOutcome,
  SplitOutcome_Tags,
  SplitStep,
  SplitStep_Tags,
  SyncMode,
  TransferKind,
  TransferStatus,
  WalletAddress,
  WalletAddress_Tags,
  WalletEvent,
  WalletEvent_Tags,
  WalletKind,
  WalletKind_Tags,
  ZingoError,
  ZingoError_Tags,
} = generated;

export const currentWallet = jest.fn();
export const developerDonationAddress = jest.fn(() => '');
export const installCryptoProvider = jest.fn();
export const parseAddress = jest.fn(() => new generated.ParsedAddress.Invalid());
export const parseViewingKey = jest.fn(
  () => new generated.ParsedViewingKey.Invalid(),
);
export const serverLatestBlock = jest.fn();
export const initLogging = jest.fn();
export const setMigrationTransmissionUri = jest.fn();
export const validateWalletBytes = jest.fn();
export const version = jest.fn(() => '');
export const walletRecoveryInfo = jest.fn();
export const zenniesDonationAddress = jest.fn(() => '');

export const Wallet = {
  openNew: jest.fn(),
  openFromSeed: jest.fn(),
  openFromUfvk: jest.fn(),
  openFromBytes: jest.fn(),
};
