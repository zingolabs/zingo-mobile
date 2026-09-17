//! The records and enums that cross the FFI, each built from its zingolib value by a `From` impl.

use std::collections::HashMap;

use pepper_sync::config::PerformanceLevel as SyncPerformanceLevel;
use pepper_sync::keys::transparent::TransparentScope;
use pepper_sync::sync::SyncResult as SyncResultUpstream;
use pepper_sync::sync::{ScanPriority as SyncScanPriority, SyncStatus as SyncStatusUpstream};
use pepper_sync::wallet::SyncMode as SyncModeUpstream;
use zcash_protocol::{PoolType, ShieldedPool};
use zingolib::config::ChainType;
use zingolib::data::ServerInfo as ServerInfoUpstream;
use zingolib::lightclient::migrate::{
    BatchPhase as BatchPhaseUpstream, BatchReport as BatchReportUpstream,
    BatchStatus as BatchStatusUpstream, ImmediateMigrationPhase, ImmediateMigrationStatus,
    ImmediateMigrationSummary, MigrationStatus as MigrationStatusUpstream, PartSendResult,
    SplitOutcome as SplitOutcomeUpstream, SplitPhase, SplitStatus as SplitStatusUpstream,
    SplitStep as SplitStepUpstream,
};
use zingolib::mixnet::{Indicator, MixnetStatus as MixnetStatusUpstream};
use zingolib::perspective::value_transfer::{
    SelfSendValueTransfer, SentValueTransfer, ValueTransfer as ValueTransferUpstream,
    ValueTransferKind,
};
use zingolib::sync::ConfirmationStatus;
use zingolib::wallet::RecoveryInfo as RecoveryInfoUpstream;
use zingolib::wallet::balance::AccountBalance;
use zingolib::wallet::keys::WalletAddressRef;
use zingolib::wallet::migration::{
    ImmediateMigrationPlan, ImmediateMigrationTx, MigrationPhase as MigrationPhaseUpstream,
    NoteSplitTx, RecommendedAction, TransmissionWindow, WindowReport as WindowReportUpstream,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum Chain {
    Main,
    Test,
    Regtest,
}

impl From<ChainType> for Chain {
    fn from(chain: ChainType) -> Self {
        match chain {
            ChainType::Mainnet => Chain::Main,
            ChainType::Testnet => Chain::Test,
            ChainType::Regtest(_) => Chain::Regtest,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum PerformanceLevel {
    Low,
    Medium,
    High,
    Maximum,
}

impl From<PerformanceLevel> for SyncPerformanceLevel {
    fn from(level: PerformanceLevel) -> Self {
        match level {
            PerformanceLevel::Low => SyncPerformanceLevel::Low,
            PerformanceLevel::Medium => SyncPerformanceLevel::Medium,
            PerformanceLevel::High => SyncPerformanceLevel::High,
            PerformanceLevel::Maximum => SyncPerformanceLevel::Maximum,
        }
    }
}

impl From<SyncPerformanceLevel> for PerformanceLevel {
    fn from(level: SyncPerformanceLevel) -> Self {
        match level {
            SyncPerformanceLevel::Low => PerformanceLevel::Low,
            SyncPerformanceLevel::Medium => PerformanceLevel::Medium,
            SyncPerformanceLevel::High => PerformanceLevel::High,
            SyncPerformanceLevel::Maximum => PerformanceLevel::Maximum,
        }
    }
}

/// How a wallet reaches the chain, and the settings it syncs with.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct Connection {
    /// Absent in Offline mode, where no Indexer is ever configured.
    pub server_uri: Option<String>,
    pub chain: Chain,
    /// The launched node's activation schedule for a regtest chain, as `key=height` entries.
    pub regtest_schedule: Option<String>,
    pub performance: PerformanceLevel,
    pub min_confirmations: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum Pool {
    Transparent,
    Sapling,
    Orchard,
    Ironwood,
}

impl From<PoolType> for Pool {
    fn from(pool: PoolType) -> Self {
        match pool {
            PoolType::Transparent => Pool::Transparent,
            PoolType::Shielded(ShieldedPool::Sapling) => Pool::Sapling,
            PoolType::Shielded(ShieldedPool::Orchard) => Pool::Orchard,
            PoolType::Shielded(ShieldedPool::Ironwood) => Pool::Ironwood,
        }
    }
}

impl From<ShieldedPool> for Pool {
    fn from(pool: ShieldedPool) -> Self {
        Pool::from(PoolType::Shielded(pool))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct Seed {
    pub seed_phrase: String,
    pub birthday: u32,
    pub no_of_accounts: u32,
    pub chain: Chain,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct ViewingKey {
    pub ufvk: String,
    pub birthday: u32,
    pub chain: Chain,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct RecoveryInfo {
    pub seed_phrase: String,
    pub birthday: u32,
    pub no_of_accounts: u32,
}

impl From<RecoveryInfoUpstream> for RecoveryInfo {
    fn from(info: RecoveryInfoUpstream) -> Self {
        Self {
            seed_phrase: info.seed_phrase,
            birthday: u32::try_from(info.birthday).unwrap_or(u32::MAX),
            no_of_accounts: info.no_of_accounts,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum WalletKind {
    Seed,
    SpendingKey,
    ViewingKey {
        transparent: bool,
        sapling: bool,
        orchard: bool,
    },
    NoKeys,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct WalletVersion {
    pub current: u64,
    pub read: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct WalletSettings {
    pub performance: PerformanceLevel,
    pub min_confirmations: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct ServerInfo {
    pub version: String,
    pub git_commit: String,
    pub server_uri: String,
    pub vendor: String,
    pub taddr_support: bool,
    pub chain_name: String,
    pub sapling_activation_height: u64,
    pub consensus_branch_id: String,
    pub latest_block_height: u64,
    pub ironwood_activation_height: Option<u32>,
}

impl ServerInfo {
    pub(crate) fn from_upstream(
        info: ServerInfoUpstream,
        ironwood_activation_height: Option<u32>,
    ) -> Self {
        Self {
            version: info.version,
            git_commit: info.git_commit,
            server_uri: info.server_uri.to_string(),
            vendor: info.vendor,
            taddr_support: info.taddr_support,
            chain_name: info.chain_name,
            sapling_activation_height: info.sapling_activation_height,
            consensus_branch_id: info.consensus_branch_id,
            latest_block_height: info.latest_block_height,
            ironwood_activation_height,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct Balance {
    pub confirmed_ironwood_balance: Option<u64>,
    pub unconfirmed_ironwood_balance: Option<u64>,
    pub total_ironwood_balance: Option<u64>,
    pub confirmed_orchard_balance: Option<u64>,
    pub unconfirmed_orchard_balance: Option<u64>,
    pub total_orchard_balance: Option<u64>,
    pub confirmed_sapling_balance: Option<u64>,
    pub unconfirmed_sapling_balance: Option<u64>,
    pub total_sapling_balance: Option<u64>,
    pub confirmed_transparent_balance: Option<u64>,
    pub unconfirmed_transparent_balance: Option<u64>,
    pub total_transparent_balance: Option<u64>,
}

impl From<AccountBalance> for Balance {
    fn from(b: AccountBalance) -> Self {
        let zats = |v: Option<zcash_protocol::value::Zatoshis>| v.map(|z| z.into_u64());
        Self {
            confirmed_ironwood_balance: zats(b.confirmed_ironwood_balance),
            unconfirmed_ironwood_balance: zats(b.unconfirmed_ironwood_balance),
            total_ironwood_balance: zats(b.total_ironwood_balance),
            confirmed_orchard_balance: zats(b.confirmed_orchard_balance),
            unconfirmed_orchard_balance: zats(b.unconfirmed_orchard_balance),
            total_orchard_balance: zats(b.total_orchard_balance),
            confirmed_sapling_balance: zats(b.confirmed_sapling_balance),
            unconfirmed_sapling_balance: zats(b.unconfirmed_sapling_balance),
            total_sapling_balance: zats(b.total_sapling_balance),
            confirmed_transparent_balance: zats(b.confirmed_transparent_balance),
            unconfirmed_transparent_balance: zats(b.unconfirmed_transparent_balance),
            total_transparent_balance: zats(b.total_transparent_balance),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum TransferStatus {
    Calculated,
    Transmitted,
    Mempool,
    Confirmed,
    Failed,
}

impl From<ConfirmationStatus> for TransferStatus {
    fn from(status: ConfirmationStatus) -> Self {
        match status {
            ConfirmationStatus::Calculated(_) => TransferStatus::Calculated,
            ConfirmationStatus::Transmitted(_) => TransferStatus::Transmitted,
            ConfirmationStatus::Mempool(_) => TransferStatus::Mempool,
            ConfirmationStatus::Confirmed(_) => TransferStatus::Confirmed,
            ConfirmationStatus::Failed(_) => TransferStatus::Failed,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum TransferKind {
    Sent,
    Received,
    SendToSelf,
    Shield,
    MemoToSelf,
    Refund,
    Migration,
}

impl From<ValueTransferKind> for TransferKind {
    fn from(kind: ValueTransferKind) -> Self {
        match kind {
            ValueTransferKind::Received => TransferKind::Received,
            ValueTransferKind::Sent(SentValueTransfer::Send) => TransferKind::Sent,
            ValueTransferKind::Sent(SentValueTransfer::SendToSelf(inner)) => match inner {
                SelfSendValueTransfer::Basic => TransferKind::SendToSelf,
                SelfSendValueTransfer::Shield => TransferKind::Shield,
                SelfSendValueTransfer::MemoToSelf => TransferKind::MemoToSelf,
                SelfSendValueTransfer::Refund => TransferKind::Refund,
                SelfSendValueTransfer::Migration => TransferKind::Migration,
            },
        }
    }
}

#[derive(Debug, Clone, PartialEq, uniffi::Record)]
pub struct ValueTransfer {
    pub txid: String,
    pub datetime: u32,
    pub status: TransferStatus,
    pub blockheight: u32,
    pub transaction_fee: Option<u64>,
    pub zec_price: Option<f32>,
    pub kind: TransferKind,
    pub value: u64,
    pub recipient_address: Option<String>,
    pub pools_sent_from: Vec<Pool>,
    pub pools_received: Vec<Pool>,
    pub memos: Vec<String>,
}

impl From<ValueTransferUpstream> for ValueTransfer {
    fn from(vt: ValueTransferUpstream) -> Self {
        Self {
            txid: vt.txid.to_string(),
            datetime: vt.datetime,
            status: vt.status.into(),
            blockheight: u32::from(vt.blockheight),
            transaction_fee: vt.transaction_fee,
            zec_price: vt.zec_price,
            kind: vt.kind.into(),
            value: vt.value,
            recipient_address: vt.recipient_address,
            pools_sent_from: vt.pools_sent_from.into_iter().map(Pool::from).collect(),
            pools_received: vt.pools_received.into_iter().map(Pool::from).collect(),
            memos: vt.memos,
        }
    }
}

/// A per-address rollup of one figure over the wallet's external sends.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct AddressTotals {
    pub totals: HashMap<String, u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum AddressScope {
    External,
    Internal,
    Refund,
}

impl From<TransparentScope> for AddressScope {
    fn from(scope: TransparentScope) -> Self {
        match scope {
            TransparentScope::External => AddressScope::External,
            TransparentScope::Internal => AddressScope::Internal,
            TransparentScope::Refund => AddressScope::Refund,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct UnifiedAddress {
    pub account: u32,
    pub address_index: u32,
    pub has_orchard: bool,
    pub has_sapling: bool,
    pub has_transparent: bool,
    pub encoded_address: String,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct TransparentAddress {
    pub account: u32,
    pub address_index: u32,
    pub scope: AddressScope,
    pub encoded_address: String,
}

/// The shielded receivers a new unified address carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Record)]
pub struct UnifiedReceivers {
    pub orchard: bool,
    pub sapling: bool,
}

/// An address the wallet's keys derive, by its place in the key tree.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum WalletAddress {
    Unified {
        account: u32,
        address_index: Option<u32>,
        has_orchard: bool,
        has_sapling: bool,
        has_transparent: bool,
        encoded_address: String,
    },
    OrchardInternal {
        account: u32,
        diversifier_index: String,
        encoded_address: String,
    },
    Sapling {
        account: u32,
        diversifier_index: String,
        encoded_address: String,
    },
    Transparent {
        account: u32,
        scope: AddressScope,
        address_index: u32,
        encoded_address: String,
    },
}

impl From<WalletAddressRef> for WalletAddress {
    fn from(address: WalletAddressRef) -> Self {
        match address {
            WalletAddressRef::Unified {
                account_id,
                address_index,
                has_orchard,
                has_sapling,
                has_transparent,
                encoded_address,
            } => WalletAddress::Unified {
                account: u32::from(account_id),
                address_index,
                has_orchard,
                has_sapling,
                has_transparent,
                encoded_address,
            },
            WalletAddressRef::OrchardInternal {
                account_id,
                diversifier_index,
                encoded_address,
            } => WalletAddress::OrchardInternal {
                account: u32::from(account_id),
                diversifier_index: u128::from(diversifier_index).to_string(),
                encoded_address,
            },
            WalletAddressRef::SaplingExternal {
                account_id,
                diversifier_index,
                encoded_address,
            } => WalletAddress::Sapling {
                account: u32::from(account_id),
                diversifier_index: u128::from(diversifier_index).to_string(),
                encoded_address,
            },
            WalletAddressRef::Transparent {
                account_id,
                scope,
                address_index,
                encoded_address,
            } => WalletAddress::Transparent {
                account: u32::from(account_id),
                scope: scope.into(),
                address_index: address_index.index(),
                encoded_address,
            },
        }
    }
}

/// What an encoded address decodes to, on whichever chain accepts it.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum ParsedAddress {
    Invalid,
    Sapling {
        chain: Chain,
    },
    Transparent {
        chain: Chain,
    },
    Tex {
        chain: Chain,
    },
    Unified {
        chain: Chain,
        receivers: Vec<Pool>,
        /// The same address reduced to its Orchard receiver, when it has one.
        shielded_only: Option<String>,
    },
}

/// What an encoded unified full viewing key decodes to.
#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum ParsedViewingKey {
    Invalid,
    Unified {
        chain: Chain,
        pools: Vec<Pool>,
        /// True when the key carries an item this software does not know.
        has_unknown_items: bool,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct Receiver {
    pub address: String,
    pub amount: u64,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct SendProposal {
    pub fee: u64,
    pub source_pools: Vec<Pool>,
    pub destination_pools: Vec<Pool>,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct ShieldProposal {
    pub value_to_shield: u64,
    pub fee: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum ScanPriority {
    RefetchingNullifiers,
    Scanning,
    Scanned,
    ScannedWithoutMapping,
    Historic,
    OpenAdjacent,
    FoundNote,
    ChainTip,
    Verify,
}

impl From<SyncScanPriority> for ScanPriority {
    fn from(priority: SyncScanPriority) -> Self {
        match priority {
            SyncScanPriority::RefetchingNullifiers => ScanPriority::RefetchingNullifiers,
            SyncScanPriority::Scanning => ScanPriority::Scanning,
            SyncScanPriority::Scanned => ScanPriority::Scanned,
            SyncScanPriority::ScannedWithoutMapping => ScanPriority::ScannedWithoutMapping,
            SyncScanPriority::Historic => ScanPriority::Historic,
            SyncScanPriority::OpenAdjacent => ScanPriority::OpenAdjacent,
            SyncScanPriority::FoundNote => ScanPriority::FoundNote,
            SyncScanPriority::ChainTip => ScanPriority::ChainTip,
            SyncScanPriority::Verify => ScanPriority::Verify,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct ScanRange {
    pub priority: ScanPriority,
    pub start_block: u32,
    pub end_block: u32,
}

#[derive(Debug, Clone, PartialEq, uniffi::Record)]
pub struct SyncStatus {
    pub scan_ranges: Vec<ScanRange>,
    pub sync_start_height: u32,
    pub session_blocks_scanned: u32,
    pub total_blocks_scanned: u32,
    pub percentage_session_blocks_scanned: f32,
    pub percentage_total_blocks_scanned: f32,
    pub session_sapling_outputs_scanned: u32,
    pub total_sapling_outputs_scanned: u32,
    pub session_orchard_outputs_scanned: u32,
    pub total_orchard_outputs_scanned: u32,
    pub session_ironwood_outputs_scanned: u32,
    pub total_ironwood_outputs_scanned: u32,
    pub percentage_session_outputs_scanned: f32,
    pub percentage_total_outputs_scanned: f32,
    pub total_outputs_scanned: u64,
    pub total_outputs: u64,
}

impl From<SyncStatusUpstream> for SyncStatus {
    fn from(s: SyncStatusUpstream) -> Self {
        Self {
            scan_ranges: s
                .scan_ranges
                .iter()
                .map(|range| ScanRange {
                    priority: range.priority().into(),
                    start_block: u32::from(range.block_range().start),
                    end_block: u32::from(range.block_range().end),
                })
                .collect(),
            sync_start_height: u32::from(s.sync_start_height),
            session_blocks_scanned: s.session_blocks_scanned,
            total_blocks_scanned: s.total_blocks_scanned,
            percentage_session_blocks_scanned: s.percentage_session_blocks_scanned,
            percentage_total_blocks_scanned: s.percentage_total_blocks_scanned,
            session_sapling_outputs_scanned: s.session_sapling_outputs_scanned,
            total_sapling_outputs_scanned: s.total_sapling_outputs_scanned,
            session_orchard_outputs_scanned: s.session_orchard_outputs_scanned,
            total_orchard_outputs_scanned: s.total_orchard_outputs_scanned,
            session_ironwood_outputs_scanned: s.session_ironwood_outputs_scanned,
            total_ironwood_outputs_scanned: s.total_ironwood_outputs_scanned,
            percentage_session_outputs_scanned: s.percentage_session_outputs_scanned,
            percentage_total_outputs_scanned: s.percentage_total_outputs_scanned,
            total_outputs_scanned: s.total_outputs_scanned,
            total_outputs: s.total_outputs,
        }
    }
}

#[derive(Debug, Clone, PartialEq, uniffi::Record)]
pub struct SyncResult {
    pub sync_start_height: u32,
    pub sync_end_height: u32,
    pub blocks_scanned: u32,
    pub sapling_outputs_scanned: u32,
    pub orchard_outputs_scanned: u32,
    pub ironwood_outputs_scanned: u32,
    pub percentage_total_outputs_scanned: f32,
}

impl From<SyncResultUpstream> for SyncResult {
    fn from(r: SyncResultUpstream) -> Self {
        Self {
            sync_start_height: u32::from(r.sync_start_height),
            sync_end_height: u32::from(r.sync_end_height),
            blocks_scanned: r.blocks_scanned,
            sapling_outputs_scanned: r.sapling_outputs_scanned,
            orchard_outputs_scanned: r.orchard_outputs_scanned,
            ironwood_outputs_scanned: r.ironwood_outputs_scanned,
            percentage_total_outputs_scanned: r.percentage_total_outputs_scanned,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum SyncMode {
    NotRunning,
    Paused,
    Running,
    Shutdown,
}

impl From<SyncModeUpstream> for SyncMode {
    fn from(mode: SyncModeUpstream) -> Self {
        match mode {
            SyncModeUpstream::NotRunning => SyncMode::NotRunning,
            SyncModeUpstream::Paused => SyncMode::Paused,
            SyncModeUpstream::Running => SyncMode::Running,
            SyncModeUpstream::Shutdown => SyncMode::Shutdown,
        }
    }
}

/// The bounded work a wallet runs one at a time.
#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum JobKind {
    Drain,
    SplitRound,
    NoteSplitting,
    Batch,
    Reconcile,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum BuildPhase {
    Building,
    Transmitting,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct DrainTransaction {
    pub inputs: Vec<u64>,
    pub output: u64,
    pub fee: u64,
}

impl DrainTransaction {
    fn from_upstream(tx: &ImmediateMigrationTx) -> Self {
        Self {
            inputs: tx.inputs.clone(),
            output: tx.output,
            fee: tx.fee(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct DrainPlan {
    pub transactions: Vec<DrainTransaction>,
    pub migrated: u64,
    pub fee: u64,
    pub residual: u64,
}

impl From<ImmediateMigrationPlan> for DrainPlan {
    fn from(plan: ImmediateMigrationPlan) -> Self {
        Self {
            transactions: plan
                .transactions
                .iter()
                .map(DrainTransaction::from_upstream)
                .collect(),
            migrated: plan.migrated,
            fee: plan.fee,
            residual: plan.residual,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct DrainReport {
    pub txids: Vec<String>,
    pub migrated: u64,
    pub fee: u64,
    pub residual: u64,
}

impl From<ImmediateMigrationSummary> for DrainReport {
    fn from(summary: ImmediateMigrationSummary) -> Self {
        Self {
            txids: summary.txids.iter().map(|txid| txid.to_string()).collect(),
            migrated: summary.migrated,
            fee: summary.fee,
            residual: summary.residual,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct DrainStatus {
    pub total: u32,
    pub built: u32,
    pub sent: u32,
    pub phase: BuildPhase,
}

impl From<ImmediateMigrationStatus> for DrainStatus {
    fn from(s: ImmediateMigrationStatus) -> Self {
        Self {
            total: s.total,
            built: s.built,
            sent: s.sent,
            phase: match s.phase {
                ImmediateMigrationPhase::Building => BuildPhase::Building,
                ImmediateMigrationPhase::Transmitting => BuildPhase::Transmitting,
            },
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct SplitTransaction {
    pub inputs: Vec<u64>,
    pub outputs: Vec<u64>,
    pub fee: u64,
}

impl SplitTransaction {
    pub(crate) fn from_upstream(tx: &NoteSplitTx) -> Self {
        Self {
            inputs: tx.inputs.clone(),
            outputs: tx.outputs.clone(),
            fee: tx.fee(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct SplitRound {
    pub transactions: Vec<SplitTransaction>,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct MigrationPlan {
    pub split_rounds: Vec<SplitRound>,
    pub parts: Vec<u64>,
    pub split_fee: u64,
    pub parts_fee: u64,
    pub residual: u64,
    pub plan_hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum SplitOutcome {
    Round { txids: Vec<String> },
    AwaitingConfirmation,
    Complete,
}

impl From<SplitOutcomeUpstream> for SplitOutcome {
    fn from(outcome: SplitOutcomeUpstream) -> Self {
        match outcome {
            SplitOutcomeUpstream::Round { txids } => SplitOutcome::Round {
                txids: txids.iter().map(|txid| txid.to_string()).collect(),
            },
            SplitOutcomeUpstream::AwaitingConfirmation => SplitOutcome::AwaitingConfirmation,
            SplitOutcomeUpstream::Complete => SplitOutcome::Complete,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum SplitStep {
    RoundBroadcast { round: u32, txids: Vec<String> },
    AwaitingConfirmation { pending: Vec<String> },
    SplittingComplete,
}

impl From<SplitStepUpstream> for SplitStep {
    fn from(step: SplitStepUpstream) -> Self {
        match step {
            SplitStepUpstream::RoundTransmitted { round, txids } => SplitStep::RoundBroadcast {
                round,
                txids: txids.iter().map(|txid| txid.to_string()).collect(),
            },
            SplitStepUpstream::AwaitingConfirmation { pending } => {
                SplitStep::AwaitingConfirmation {
                    pending: pending.iter().map(|txid| txid.to_string()).collect(),
                }
            }
            SplitStepUpstream::SplittingComplete => SplitStep::SplittingComplete,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct SplitStatus {
    pub total: u32,
    pub built: u32,
    pub sent: u32,
    pub phase: BuildPhase,
}

impl From<SplitStatusUpstream> for SplitStatus {
    fn from(s: SplitStatusUpstream) -> Self {
        Self {
            total: s.total,
            built: s.built,
            sent: s.sent,
            phase: match s.phase {
                SplitPhase::Building => BuildPhase::Building,
                SplitPhase::Transmitting => BuildPhase::Transmitting,
            },
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum MigrationPhase {
    Planned,
    NoteSplitting {
        round: u32,
        pending_txids: Vec<String>,
    },
    PartsScheduled,
    Complete {
        residual: u64,
    },
}

impl MigrationPhase {
    fn from_upstream(phase: &MigrationPhaseUpstream) -> Self {
        match phase {
            MigrationPhaseUpstream::Planned => MigrationPhase::Planned,
            MigrationPhaseUpstream::NoteSplitting {
                round,
                pending_txids,
            } => MigrationPhase::NoteSplitting {
                round: *round,
                pending_txids: pending_txids.iter().map(|txid| txid.to_string()).collect(),
            },
            MigrationPhaseUpstream::PartsScheduled => MigrationPhase::PartsScheduled,
            MigrationPhaseUpstream::Complete { residual } => MigrationPhase::Complete {
                residual: *residual,
            },
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct BroadcastWindow {
    pub bucket_index: u64,
    pub boundary: u32,
    pub part_ids: Vec<u32>,
    pub denominations: Vec<u64>,
    pub window_opens_unix_time: u64,
    pub latest_target_unix_time: u64,
}

impl BroadcastWindow {
    pub(crate) fn from_upstream(
        window: &TransmissionWindow,
        denominations: &HashMap<u32, u64>,
    ) -> Self {
        Self {
            bucket_index: window.bucket_index,
            boundary: u32::from(window.boundary),
            part_ids: window.part_ids.iter().map(|id| id.0).collect(),
            denominations: window
                .part_ids
                .iter()
                .map(|id| denominations.get(&id.0).copied().unwrap_or(0))
                .collect(),
            window_opens_unix_time: window.window_opens_unix_time,
            latest_target_unix_time: window.latest_target_unix_time,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct DueBatch {
    pub boundary: u32,
    pub part_ids: Vec<u32>,
    pub denominations: Vec<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct MigrationStatus {
    pub orchard_confirmed_spendable: u64,
    pub phase: Option<MigrationPhase>,
    pub parts_total: u32,
    pub parts_confirmed: u32,
    pub parts_broadcast: u32,
    pub value_total: u64,
    pub value_migrated: u64,
    pub per_bucket: Option<u32>,
    pub bucket_modulus: u32,
    pub upcoming_windows: Vec<BroadcastWindow>,
    pub due_now: Option<DueBatch>,
}

impl MigrationStatus {
    pub(crate) fn from_upstream(
        status: MigrationStatusUpstream,
        denominations: &HashMap<u32, u64>,
        per_bucket: Option<u32>,
        bucket_modulus: u32,
        parts_broadcast: u32,
    ) -> Self {
        Self {
            orchard_confirmed_spendable: status.orchard_confirmed_spendable,
            phase: status.phase.as_ref().map(MigrationPhase::from_upstream),
            parts_total: status.parts_total,
            parts_confirmed: status.parts_confirmed,
            parts_broadcast,
            value_total: status.value_total,
            value_migrated: status.value_migrated,
            per_bucket,
            bucket_modulus,
            upcoming_windows: status
                .upcoming_windows
                .iter()
                .map(|window| BroadcastWindow::from_upstream(window, denominations))
                .collect(),
            due_now: status.due_now.map(|batch| DueBatch {
                boundary: u32::from(batch.boundary),
                part_ids: batch.part_ids.iter().map(|id| id.0).collect(),
                denominations: batch.denominations,
            }),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct WindowReport {
    pub bucket_index: u64,
    pub boundary: u32,
    pub close: u32,
    pub is_current: bool,
    pub parts_total: u32,
    pub parts_confirmed: u32,
    pub value_total: u64,
    pub value_migrated: u64,
}

impl WindowReport {
    pub(crate) fn from_upstream(w: &WindowReportUpstream) -> Self {
        Self {
            bucket_index: w.bucket_index,
            boundary: u32::from(w.boundary),
            close: u32::from(w.close),
            is_current: w.is_current,
            parts_total: w.parts_total,
            parts_confirmed: w.parts_confirmed,
            value_total: w.value_total,
            value_migrated: w.value_migrated,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum ReconcileAction {
    AwaitSplitConfirmation,
    RetrySplit { txid: String },
    ContinueNoteSplitting,
    PromoteConfirmed { part: u32 },
    Rebuild { part: u32 },
    MarkInvalidated { part: u32 },
    ReplanRemainder,
    PromptCatchUp { parts: Vec<u32> },
    MarkComplete { residual: u64 },
}

impl ReconcileAction {
    pub(crate) fn from_upstream(action: &RecommendedAction) -> Self {
        match action {
            RecommendedAction::AwaitSplitConfirmation => ReconcileAction::AwaitSplitConfirmation,
            RecommendedAction::RetrySplit { txid } => ReconcileAction::RetrySplit {
                txid: txid.to_string(),
            },
            RecommendedAction::ContinueNoteSplitting => ReconcileAction::ContinueNoteSplitting,
            RecommendedAction::PromoteConfirmed { part, .. } => {
                ReconcileAction::PromoteConfirmed { part: part.0 }
            }
            RecommendedAction::Rebuild { part } => ReconcileAction::Rebuild { part: part.0 },
            RecommendedAction::MarkInvalidated { part } => {
                ReconcileAction::MarkInvalidated { part: part.0 }
            }
            RecommendedAction::ReplanRemainder => ReconcileAction::ReplanRemainder,
            RecommendedAction::PromptCatchUp { parts, .. } => ReconcileAction::PromptCatchUp {
                parts: parts.iter().map(|id| id.0).collect(),
            },
            RecommendedAction::MarkComplete { residual } => ReconcileAction::MarkComplete {
                residual: *residual,
            },
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Enum)]
pub enum PartResult {
    Sent { txid: String },
    Slid,
    NotDue { window_opens_unix_time: u64 },
    Failed { error: String },
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct PartOutcome {
    pub part: u32,
    pub denomination: u64,
    pub result: PartResult,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct BatchReport {
    pub outcomes: Vec<PartOutcome>,
    pub halted: Option<String>,
}

impl From<BatchReportUpstream> for BatchReport {
    fn from(report: BatchReportUpstream) -> Self {
        Self {
            outcomes: report
                .outcomes
                .iter()
                .map(|o| PartOutcome {
                    part: o.part.0,
                    denomination: o.denomination,
                    result: match &o.result {
                        PartSendResult::Sent(txid) => PartResult::Sent {
                            txid: txid.to_string(),
                        },
                        PartSendResult::Slid => PartResult::Slid,
                        PartSendResult::NotDue {
                            window_opens_unix_time,
                        } => PartResult::NotDue {
                            window_opens_unix_time: *window_opens_unix_time,
                        },
                        PartSendResult::Failed { error } => PartResult::Failed {
                            error: error.clone(),
                        },
                    },
                })
                .collect(),
            halted: report.halted,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum BatchPhase {
    Sending,
    Spacing,
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct BatchStatus {
    pub total: u32,
    pub resolved: u32,
    pub sent: u32,
    pub phase: BatchPhase,
}

impl From<BatchStatusUpstream> for BatchStatus {
    fn from(s: BatchStatusUpstream) -> Self {
        Self {
            total: s.total,
            resolved: s.resolved,
            sent: s.sent,
            phase: match s.phase {
                BatchPhaseUpstream::Sending => BatchPhase::Sending,
                BatchPhaseUpstream::Spacing => BatchPhase::Spacing,
            },
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum MixnetIndicator {
    Off,
    Bootstrapping,
    Ready,
    Died,
}

impl From<Indicator> for MixnetIndicator {
    fn from(indicator: Indicator) -> Self {
        match indicator {
            Indicator::SwitchedOff => MixnetIndicator::Off,
            Indicator::Bootstrapping => MixnetIndicator::Bootstrapping,
            Indicator::Ready | Indicator::PreviouslyProvenThisEpoch => MixnetIndicator::Ready,
            Indicator::Died | Indicator::Unattached => MixnetIndicator::Died,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, uniffi::Record)]
pub struct MixnetStatus {
    pub indicator: MixnetIndicator,
    pub socks5_addr: Option<String>,
    pub bootstrap_detail: Option<String>,
}

impl MixnetStatus {
    pub(crate) fn from_upstream(status: &MixnetStatusUpstream) -> Self {
        Self {
            indicator: status.mode.into(),
            socks5_addr: status.socks5_addr.map(|addr| addr.to_string()),
            bootstrap_detail: status.bootstrap_detail.clone(),
        }
    }
}

/// What a wallet reports while it works, delivered through an `EventStream`.
#[derive(Debug, Clone, PartialEq, uniffi::Enum)]
pub enum WalletEvent {
    SyncProgress { status: SyncStatus },
    SyncComplete { result: SyncResult },
    SyncFailed { error: crate::error::ZingoError },
    DrainProgress { status: DrainStatus },
    SplitProgress { status: SplitStatus },
    BatchProgress { status: BatchStatus },
    MixnetMode { status: MixnetStatus },
    Lagged { missed: u64 },
}
