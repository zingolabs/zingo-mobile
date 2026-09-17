//! The typed failure of every FFI call and the one funnel from zingolib's error tree into it.

use pepper_sync::error::SyncError;
use zcash_client_backend::data_api::error::Error as BackendError;
use zingolib::lightclient::error::LightClientError;
use zingolib::lightclient::error::MigrationError;
use zingolib::lightclient::error::SendError;
use zingolib::lightclient::error::TransmissionError;
use zingolib::mixnet::MixnetNotReady;
use zingolib::wallet::error::KeyError;
use zingolib::wallet::error::ProposeSendError;
use zingolib::wallet::error::ProposeShieldError;
use zingolib::wallet::error::WalletError;

use crate::types::JobKind;

/// The typed failure of every wallet call: a cause the app acts on, with the
/// upstream cause chain rendered into `detail` for diagnostics only.
#[derive(Debug, Clone, PartialEq, thiserror::Error, uniffi::Error)]
pub enum ZingoError {
    #[error("panic: {detail}")]
    Panic { detail: String },
    #[error("the wallet is poisoned by an earlier panic: {detail}")]
    Poisoned { detail: String },
    #[error("busy with {running:?}")]
    Busy { running: JobKind },
    #[error("the wallet is closed")]
    Closed,
    #[error("internal: {detail}")]
    Internal { detail: String },
    #[error("invalid input: {detail}")]
    InvalidInput { detail: String },
    #[error("invalid mnemonic: {detail}")]
    InvalidMnemonic { detail: String },
    #[error("mnemonic not found")]
    MnemonicNotFound,
    #[error("viewing key malformed: {detail}")]
    ViewingKeyMalformed { detail: String },
    #[error("viewing key network mismatch: {detail}")]
    ViewingKeyNetworkMismatch { detail: String },
    #[error("birthday {birthday} below activation height {activation}: {detail}")]
    BirthdayBelowActivation {
        birthday: u32,
        activation: u32,
        detail: String,
    },
    #[error("wallet unreadable: {detail}")]
    WalletUnreadable { detail: String },
    #[error("wallet: {detail}")]
    Wallet { detail: String },
    #[error("no spend capability: {detail}")]
    NoSpendCapability { detail: String },
    #[error("transparent address gap: {detail}")]
    TransparentAddressGap { detail: String },
    #[error("saving wallet: {detail}")]
    Save { detail: String },
    #[error("offline: no indexer configured")]
    Offline,
    #[error("indexer unreachable: {detail}")]
    IndexerUnreachable { detail: String },
    #[error("indexer request failed: {detail}")]
    IndexerRequestFailed { detail: String },
    #[error("no eligible destination: {detail}")]
    DestinationIneligible { detail: String },
    #[error("price unavailable: {detail}")]
    PriceUnavailable { detail: String },
    #[error("sync: {detail}")]
    Sync { detail: String },
    #[error("sync mode: {detail}")]
    SyncMode { detail: String },
    #[error("sync required: {detail}")]
    SyncRequired { detail: String },
    #[error("insufficient funds: {available} available, {required} required")]
    InsufficientFunds {
        available: u64,
        required: u64,
        detail: String,
    },
    #[error("nothing to shield: {detail}")]
    NothingToShield { detail: String },
    #[error("proposal failed: {detail}")]
    ProposalFailed { detail: String },
    #[error("transaction build failed: {detail}")]
    TransactionBuildFailed { detail: String },
    #[error("no stored proposal")]
    NoStoredProposal,
    #[error("transmission failed: {detail}")]
    TransmissionFailed { detail: String },
    #[error("no migration in progress")]
    MigrationNotInProgress,
    #[error("a migration is already in progress")]
    MigrationAlreadyInProgress,
    #[error("migration consent stale: {detail}")]
    MigrationConsentStale { detail: String },
    #[error("migration cadence fixed: {detail}")]
    MigrationCadenceFixed { detail: String },
    #[error("migration pre-signed strategy unavailable: {detail}")]
    MigrationPreSignedUnavailable { detail: String },
    #[error("migration needs note splitting: {detail}")]
    MigrationNoteSplittingRequired { detail: String },
    #[error("migration belongs to a different account: {detail}")]
    MigrationDifferentAccount { detail: String },
    #[error("ironwood era too young, retry after {retry_after}: {detail}")]
    MigrationIronwoodEraTooYoung { retry_after: u32, detail: String },
    #[error("migration note splitting failed: {detail}")]
    MigrationSplitFailed { detail: String },
    #[error("nothing to migrate")]
    NothingToMigrate,
    #[error("mixnet unattached: {detail}")]
    MixnetUnattached { detail: String },
    #[error("mixnet bootstrapping: {detail}")]
    MixnetBootstrapping { detail: String },
    #[error("mixnet died: {detail}")]
    MixnetDied { detail: String },
    #[error("mixnet switched off: {detail}")]
    MixnetSwitchedOff { detail: String },
    #[error("mixnet enable failed: {detail}")]
    MixnetEnableFailed { detail: String },
}

/// The failure of a wallet-file operation, where every variant carries its detail alone.
#[derive(Debug, Clone, PartialEq, thiserror::Error, uniffi::Error)]
pub enum LoadError {
    #[error("wallet unreadable: {detail}")]
    Unreadable { detail: String },
    #[error("invalid input: {detail}")]
    InvalidInput { detail: String },
    #[error("saving wallet: {detail}")]
    Save { detail: String },
    #[error("panic: {detail}")]
    Panic { detail: String },
    #[error("the wallet is poisoned by an earlier panic: {detail}")]
    Poisoned { detail: String },
    #[error("busy: {detail}")]
    Busy { detail: String },
    #[error("internal: {detail}")]
    Internal { detail: String },
}

impl From<ZingoError> for LoadError {
    fn from(e: ZingoError) -> Self {
        let text = e.to_string();
        match e {
            ZingoError::WalletUnreadable { detail } => LoadError::Unreadable { detail },
            ZingoError::InvalidInput { detail } => LoadError::InvalidInput { detail },
            ZingoError::Save { detail } => LoadError::Save { detail },
            ZingoError::Panic { detail } => LoadError::Panic { detail },
            ZingoError::Poisoned { detail } => LoadError::Poisoned { detail },
            ZingoError::Busy { .. } => LoadError::Busy { detail: text },
            _ => LoadError::Internal { detail: text },
        }
    }
}

/// Renders an error and its source chain as one diagnostic line, outermost first.
pub(crate) fn detail(error: &(dyn std::error::Error + 'static)) -> String {
    let mut texts: Vec<String> = Vec::new();
    let mut cursor = Some(error);
    while let Some(layer) = cursor {
        let text = layer.to_string();
        if texts.last().is_none_or(|outer| !outer.contains(&text)) {
            texts.push(text);
        }
        cursor = layer.source();
    }
    texts.join(": ")
}

impl ZingoError {
    /// The variant name, the tag the app switches on.
    pub(crate) fn tag(&self) -> &'static str {
        match self {
            Self::Panic { .. } => "Panic",
            Self::Poisoned { .. } => "Poisoned",
            Self::Busy { .. } => "Busy",
            Self::Closed => "Closed",
            Self::Internal { .. } => "Internal",
            Self::InvalidInput { .. } => "InvalidInput",
            Self::InvalidMnemonic { .. } => "InvalidMnemonic",
            Self::MnemonicNotFound => "MnemonicNotFound",
            Self::ViewingKeyMalformed { .. } => "ViewingKeyMalformed",
            Self::ViewingKeyNetworkMismatch { .. } => "ViewingKeyNetworkMismatch",
            Self::BirthdayBelowActivation { .. } => "BirthdayBelowActivation",
            Self::WalletUnreadable { .. } => "WalletUnreadable",
            Self::Wallet { .. } => "Wallet",
            Self::NoSpendCapability { .. } => "NoSpendCapability",
            Self::TransparentAddressGap { .. } => "TransparentAddressGap",
            Self::Save { .. } => "Save",
            Self::Offline => "Offline",
            Self::IndexerUnreachable { .. } => "IndexerUnreachable",
            Self::IndexerRequestFailed { .. } => "IndexerRequestFailed",
            Self::DestinationIneligible { .. } => "DestinationIneligible",
            Self::PriceUnavailable { .. } => "PriceUnavailable",
            Self::Sync { .. } => "Sync",
            Self::SyncMode { .. } => "SyncMode",
            Self::SyncRequired { .. } => "SyncRequired",
            Self::InsufficientFunds { .. } => "InsufficientFunds",
            Self::NothingToShield { .. } => "NothingToShield",
            Self::ProposalFailed { .. } => "ProposalFailed",
            Self::TransactionBuildFailed { .. } => "TransactionBuildFailed",
            Self::NoStoredProposal => "NoStoredProposal",
            Self::TransmissionFailed { .. } => "TransmissionFailed",
            Self::MigrationNotInProgress => "MigrationNotInProgress",
            Self::MigrationAlreadyInProgress => "MigrationAlreadyInProgress",
            Self::MigrationConsentStale { .. } => "MigrationConsentStale",
            Self::MigrationCadenceFixed { .. } => "MigrationCadenceFixed",
            Self::MigrationPreSignedUnavailable { .. } => "MigrationPreSignedUnavailable",
            Self::MigrationNoteSplittingRequired { .. } => "MigrationNoteSplittingRequired",
            Self::MigrationDifferentAccount { .. } => "MigrationDifferentAccount",
            Self::MigrationIronwoodEraTooYoung { .. } => "MigrationIronwoodEraTooYoung",
            Self::MigrationSplitFailed { .. } => "MigrationSplitFailed",
            Self::NothingToMigrate => "NothingToMigrate",
            Self::MixnetUnattached { .. } => "MixnetUnattached",
            Self::MixnetBootstrapping { .. } => "MixnetBootstrapping",
            Self::MixnetDied { .. } => "MixnetDied",
            Self::MixnetSwitchedOff { .. } => "MixnetSwitchedOff",
            Self::MixnetEnableFailed { .. } => "MixnetEnableFailed",
        }
    }

    pub(crate) fn internal(e: impl std::error::Error + 'static) -> Self {
        Self::Internal { detail: detail(&e) }
    }

    pub(crate) fn invalid_input(e: impl std::error::Error + 'static) -> Self {
        Self::InvalidInput { detail: detail(&e) }
    }

    pub(crate) fn input(text: impl Into<String>) -> Self {
        Self::InvalidInput {
            detail: text.into(),
        }
    }

    pub(crate) fn unreadable(e: impl std::error::Error + 'static) -> Self {
        Self::WalletUnreadable { detail: detail(&e) }
    }

    pub(crate) fn save(e: impl std::error::Error + 'static) -> Self {
        Self::Save { detail: detail(&e) }
    }

    pub(crate) fn indexer_unreachable(e: impl std::error::Error + 'static) -> Self {
        Self::IndexerUnreachable { detail: detail(&e) }
    }

    pub(crate) fn indexer_request_failed(e: impl std::error::Error + 'static) -> Self {
        Self::IndexerRequestFailed { detail: detail(&e) }
    }

    pub(crate) fn sync_mode(e: impl std::error::Error + 'static) -> Self {
        Self::SyncMode { detail: detail(&e) }
    }

    pub(crate) fn mixnet_enable_failed(e: impl std::error::Error + 'static) -> Self {
        Self::MixnetEnableFailed { detail: detail(&e) }
    }
}

/// The one funnel from zingolib's error tree to the FFI's causes, exhaustive
/// at every level.
pub(crate) fn ffi_error(e: LightClientError) -> ZingoError {
    let detail = detail(&e);
    match e {
        LightClientError::SyncLaunchError => ZingoError::Sync { detail },
        LightClientError::SyncNotRunning | LightClientError::SyncModeError(_) => {
            ZingoError::SyncMode { detail }
        }
        LightClientError::SyncError(inner) => sync_error(inner, detail),
        LightClientError::SendError(inner) => send_error(inner, detail),
        LightClientError::ClientError(_) => ZingoError::IndexerUnreachable { detail },
        LightClientError::IndexerError(_) => ZingoError::IndexerRequestFailed { detail },
        LightClientError::FileError(_) => ZingoError::Save { detail },
        LightClientError::WalletError(inner) => wallet_error(inner, detail),
        LightClientError::MigrationError(inner) => migration_error(inner, detail),
        LightClientError::Offline => ZingoError::Offline,
        LightClientError::PriceError(_) => ZingoError::PriceUnavailable { detail },
        LightClientError::MixnetNotReady(inner) => mixnet_not_ready(inner, detail),
        LightClientError::ProbeRequiresMixnet => ZingoError::MixnetSwitchedOff { detail },
        LightClientError::IneligibleProbeTarget(_) => ZingoError::InvalidInput { detail },
        LightClientError::NoEligibleDestination(_)
        | LightClientError::MigrationTransmissionTargetIsSyncEndpoint { .. } => {
            ZingoError::DestinationIneligible { detail }
        }
    }
}

/// Classifies a `LightClient::from_bytes` failure, where a file error is the
/// deserializer rejecting the bytes.
pub(crate) fn open_error(e: LightClientError) -> ZingoError {
    match e {
        LightClientError::FileError(inner) => ZingoError::unreadable(inner),
        other => ffi_error(other),
    }
}

fn sync_error(e: SyncError<WalletError>, detail: String) -> ZingoError {
    match e {
        SyncError::ServerError(_) => ZingoError::IndexerRequestFailed { detail },
        SyncError::SyncModeError(_) => ZingoError::SyncMode { detail },
        SyncError::WalletError(inner) => wallet_error(inner, detail),
        SyncError::MempoolError(_)
        | SyncError::ScanError(_)
        | SyncError::ChainError(..)
        | SyncError::BirthdayBelowSapling(..)
        | SyncError::ShardTreeError(_)
        | SyncError::TruncationError(..)
        | SyncError::PoolHistoryReopened { .. }
        | SyncError::TransparentAddressDerivationError(_) => ZingoError::Sync { detail },
    }
}

fn send_error(e: SendError, detail: String) -> ZingoError {
    match e {
        SendError::ProposeSendError(ProposeSendError::Proposal(
            BackendError::InsufficientFunds {
                available,
                required,
            },
        )) => ZingoError::InsufficientFunds {
            available: available.into_u64(),
            required: required.into_u64(),
            detail,
        },
        SendError::ProposeSendError(ProposeSendError::Proposal(BackendError::ScanRequired)) => {
            ZingoError::SyncRequired { detail }
        }
        SendError::ProposeSendError(
            ProposeSendError::Proposal(_) | ProposeSendError::TransactionRequestFailed(_),
        ) => ZingoError::ProposalFailed { detail },
        SendError::ProposeShieldError(ProposeShieldError::InsufficientFunds) => {
            ZingoError::NothingToShield { detail }
        }
        SendError::ProposeShieldError(
            ProposeShieldError::Component(_) | ProposeShieldError::AddressParseError(_),
        ) => ZingoError::ProposalFailed { detail },
        SendError::CalculateSendError(_)
        | SendError::CalculateShieldError(_)
        | SendError::RetargetError(_) => ZingoError::TransactionBuildFailed { detail },
        SendError::NoStoredProposal => ZingoError::NoStoredProposal,
        SendError::TransmissionError(
            TransmissionError::TransmissionFailed(_)
            | TransmissionError::IncorrectTxidFromServer(..),
        ) => ZingoError::TransmissionFailed { detail },
        SendError::TransmissionError(TransmissionError::IncorrectTransactionStatus(_)) => {
            ZingoError::Internal { detail }
        }
    }
}

fn wallet_error(e: WalletError, detail: String) -> ZingoError {
    match e {
        WalletError::KeyError(inner) => key_error(inner, detail),
        WalletError::MnemonicError(_) => ZingoError::InvalidMnemonic { detail },
        WalletError::MnemonicNotFound => ZingoError::MnemonicNotFound,
        WalletError::BirthdayBelowSapling(birthday, activation) => {
            ZingoError::BirthdayBelowActivation {
                birthday,
                activation,
                detail,
            }
        }
        WalletError::NoSyncData | WalletError::SyncIncomplete => {
            ZingoError::SyncRequired { detail }
        }
        WalletError::NothingToMigrate => ZingoError::NothingToMigrate,
        WalletError::InvalidValue(_)
        | WalletError::TransactionRead(_)
        | WalletError::TransactionWrite(_)
        | WalletError::RemovalError
        | WalletError::TransactionNotFound(_)
        | WalletError::BlockNotFound(_)
        | WalletError::MinimumConfirmationError
        | WalletError::CalculatedTxScanError(_)
        | WalletError::ParseError(_)
        | WalletError::AccountCreationFailed
        | WalletError::CheckpointNotFound { .. }
        | WalletError::ShardTreeError(_)
        | WalletError::MigrationNoteNotFound(_)
        | WalletError::MigrationBuild(_)
        | WalletError::MigrationBoundNoteMissing(_)
        | WalletError::MigrationDeviation(_)
        | WalletError::MigrationInvalidTransition { .. }
        | WalletError::MigrationStateCorrupt(_)
        | WalletError::MigrationNoLegalAnchor { .. }
        | WalletError::AllFundsEverythingUnsupported
        | WalletError::ConversionFailed(_)
        | WalletError::WalletAlreadyCreated => ZingoError::Wallet { detail },
    }
}

pub(crate) fn wallet_failure(e: WalletError) -> ZingoError {
    let text = detail(&e);
    wallet_error(e, text)
}

fn key_error(e: KeyError, detail: String) -> ZingoError {
    match e {
        KeyError::InvalidMnemonicPhrase(_) => ZingoError::InvalidMnemonic { detail },
        KeyError::NetworkMismatch => ZingoError::ViewingKeyNetworkMismatch { detail },
        KeyError::KeyParseError(_) | KeyError::KeyDecodingError | KeyError::InvalidFormat => {
            ZingoError::ViewingKeyMalformed { detail }
        }
        KeyError::NoSpendCapability => ZingoError::NoSpendCapability { detail },
        KeyError::GapError => ZingoError::TransparentAddressGap { detail },
        KeyError::IoError(_)
        | KeyError::InvalidAccountId(_)
        | KeyError::NoAccountKeys
        | KeyError::KeyDerivationError(_)
        | KeyError::NoViewCapability
        | KeyError::InvalidNonHardenedChildIndex
        | KeyError::UnifiedAddressError => ZingoError::Wallet { detail },
    }
}

pub(crate) fn key_failure(e: KeyError) -> ZingoError {
    let text = detail(&e);
    key_error(e, text)
}

fn migration_error(e: MigrationError, detail: String) -> ZingoError {
    match e {
        MigrationError::NoMigration => ZingoError::MigrationNotInProgress,
        MigrationError::AlreadyInProgress | MigrationError::ScheduledMigrationExists => {
            ZingoError::MigrationAlreadyInProgress
        }
        MigrationError::ConsentStale => ZingoError::MigrationConsentStale { detail },
        MigrationError::CadenceFixed => ZingoError::MigrationCadenceFixed { detail },
        MigrationError::PreSignedUnavailable => {
            ZingoError::MigrationPreSignedUnavailable { detail }
        }
        MigrationError::NoteSplittingRequired => {
            ZingoError::MigrationNoteSplittingRequired { detail }
        }
        MigrationError::DifferentAccount => ZingoError::MigrationDifferentAccount { detail },
        MigrationError::IronwoodEraTooYoung { retry_after } => {
            ZingoError::MigrationIronwoodEraTooYoung {
                retry_after: u32::from(retry_after),
                detail,
            }
        }
        MigrationError::SplitDidNotConverge(_)
        | MigrationError::SplitTransactionFailed(_)
        | MigrationError::SplitConfirmationTimeout => ZingoError::MigrationSplitFailed { detail },
    }
}

fn mixnet_not_ready(e: MixnetNotReady, detail: String) -> ZingoError {
    match e {
        MixnetNotReady::Unattached => ZingoError::MixnetUnattached { detail },
        MixnetNotReady::Bootstrapping => ZingoError::MixnetBootstrapping { detail },
        MixnetNotReady::Died => ZingoError::MixnetDied { detail },
    }
}

pub(crate) fn sync_failure(e: SyncError<WalletError>) -> ZingoError {
    let text = detail(&e);
    sync_error(e, text)
}

/// The routing seam (#1229): a mixnet refusal and an exhausted Destination
/// pool are different causes with different remedies, and each must arrive
/// as its own variant.
#[cfg(test)]
mod ffi_error_routing_tests {
    use super::*;

    #[test]
    fn a_mixnet_refusal_names_the_mixnet_state() {
        let mapped = ffi_error(LightClientError::MixnetNotReady(
            MixnetNotReady::Bootstrapping,
        ));
        assert!(
            matches!(&mapped, ZingoError::MixnetBootstrapping { .. }),
            "a refusal must name the mixnet state: {mapped:?}"
        );
    }

    #[test]
    fn excluded_indexer_exhaustion_is_a_destination_failure_not_a_refusal() {
        let mapped = ffi_error(LightClientError::NoEligibleDestination(
            zingolib::destination::NoEligibleDestinations::EmptyPool,
        ));
        assert!(
            matches!(&mapped, ZingoError::DestinationIneligible { .. }),
            "exhaustion is a pool problem, never a mixnet refusal: {mapped:?}"
        );
    }
}

/// Pins the behavior of [`ffi_error`], the one funnel from zingolib's error
/// tree to the FFI's causes. The match itself is exhaustive and a new
/// zingolib variant fails compilation. These tests pin which cause each
/// input maps to. Inputs are limited to variants constructible without
/// wallet or network state.
#[cfg(test)]
mod error_funnel_tests {
    use super::*;
    use zcash_protocol::TxId;
    use zcash_protocol::value::Zatoshis;

    type FunnelCase = (LightClientError, fn(&ZingoError) -> bool, &'static str);

    #[test]
    fn the_funnel_maps_each_constructible_input_to_its_pinned_cause() {
        let cases: Vec<FunnelCase> = vec![
            (
                LightClientError::SyncLaunchError,
                |e| matches!(e, ZingoError::Sync { .. }),
                "Sync",
            ),
            (
                LightClientError::SyncNotRunning,
                |e| matches!(e, ZingoError::SyncMode { .. }),
                "SyncMode",
            ),
            (
                LightClientError::SendError(SendError::NoStoredProposal),
                |e| matches!(e, ZingoError::NoStoredProposal),
                "NoStoredProposal",
            ),
            (
                LightClientError::SendError(SendError::TransmissionError(
                    TransmissionError::TransmissionFailed("node said no".to_string()),
                )),
                |e| matches!(e, ZingoError::TransmissionFailed { .. }),
                "TransmissionFailed",
            ),
            (
                LightClientError::SendError(SendError::ProposeShieldError(
                    ProposeShieldError::InsufficientFunds,
                )),
                |e| matches!(e, ZingoError::NothingToShield { .. }),
                "NothingToShield",
            ),
            (
                LightClientError::FileError(std::io::Error::other("disk full")),
                |e| matches!(e, ZingoError::Save { .. }),
                "Save",
            ),
            (
                LightClientError::WalletError(WalletError::MnemonicNotFound),
                |e| matches!(e, ZingoError::MnemonicNotFound),
                "MnemonicNotFound",
            ),
            (
                LightClientError::WalletError(WalletError::KeyError(KeyError::NetworkMismatch)),
                |e| matches!(e, ZingoError::ViewingKeyNetworkMismatch { .. }),
                "ViewingKeyNetworkMismatch",
            ),
            (
                LightClientError::WalletError(WalletError::KeyError(KeyError::GapError)),
                |e| matches!(e, ZingoError::TransparentAddressGap { .. }),
                "TransparentAddressGap",
            ),
            (
                LightClientError::WalletError(WalletError::NoSyncData),
                |e| matches!(e, ZingoError::SyncRequired { .. }),
                "SyncRequired",
            ),
            (
                LightClientError::WalletError(WalletError::NothingToMigrate),
                |e| matches!(e, ZingoError::NothingToMigrate),
                "NothingToMigrate",
            ),
            (
                LightClientError::WalletError(WalletError::RemovalError),
                |e| matches!(e, ZingoError::Wallet { .. }),
                "Wallet",
            ),
            (
                LightClientError::Offline,
                |e| matches!(e, ZingoError::Offline),
                "Offline",
            ),
            (
                LightClientError::ProbeRequiresMixnet,
                |e| matches!(e, ZingoError::MixnetSwitchedOff { .. }),
                "MixnetSwitchedOff",
            ),
            (
                LightClientError::MixnetNotReady(MixnetNotReady::Died),
                |e| matches!(e, ZingoError::MixnetDied { .. }),
                "MixnetDied",
            ),
            (
                LightClientError::MigrationError(MigrationError::NoMigration),
                |e| matches!(e, ZingoError::MigrationNotInProgress),
                "MigrationNotInProgress",
            ),
            (
                LightClientError::MigrationError(MigrationError::AlreadyInProgress),
                |e| matches!(e, ZingoError::MigrationAlreadyInProgress),
                "MigrationAlreadyInProgress",
            ),
            (
                LightClientError::MigrationError(MigrationError::ConsentStale),
                |e| matches!(e, ZingoError::MigrationConsentStale { .. }),
                "MigrationConsentStale",
            ),
            (
                LightClientError::MigrationError(MigrationError::CadenceFixed),
                |e| matches!(e, ZingoError::MigrationCadenceFixed { .. }),
                "MigrationCadenceFixed",
            ),
            (
                LightClientError::MigrationError(MigrationError::PreSignedUnavailable),
                |e| matches!(e, ZingoError::MigrationPreSignedUnavailable { .. }),
                "MigrationPreSignedUnavailable",
            ),
            (
                LightClientError::MigrationError(MigrationError::SplitDidNotConverge(3)),
                |e| matches!(e, ZingoError::MigrationSplitFailed { .. }),
                "MigrationSplitFailed",
            ),
            (
                LightClientError::MigrationError(MigrationError::SplitTransactionFailed(
                    TxId::from_bytes([0u8; 32]),
                )),
                |e| matches!(e, ZingoError::MigrationSplitFailed { .. }),
                "MigrationSplitFailed",
            ),
            (
                LightClientError::MigrationError(MigrationError::SplitConfirmationTimeout),
                |e| matches!(e, ZingoError::MigrationSplitFailed { .. }),
                "MigrationSplitFailed",
            ),
        ];
        for (input, is_expected, expected_name) in cases {
            let input_text = input.to_string();
            let mapped = ffi_error(input);
            assert!(
                is_expected(&mapped),
                "{input_text:?} must map to the {expected_name} variant, got: {mapped}"
            );
        }
    }

    /// Tests that the funnel carries the amounts when a proposal fails for
    /// insufficient funds.
    #[test]
    fn insufficient_funds_carries_the_amounts() {
        let mapped = ffi_error(LightClientError::SendError(SendError::ProposeSendError(
            ProposeSendError::Proposal(BackendError::InsufficientFunds {
                available: Zatoshis::const_from_u64(5_000),
                required: Zatoshis::const_from_u64(9_000),
            }),
        )));
        let ZingoError::InsufficientFunds {
            available,
            required,
            ..
        } = mapped
        else {
            panic!("the failure must be InsufficientFunds: {mapped}");
        };
        assert_eq!((available, required), (5_000, 9_000));
    }

    /// Tests that the funnel carries the retry height when the Ironwood era
    /// is too young for a migration part.
    #[test]
    fn ironwood_era_too_young_carries_the_retry_height() {
        let mapped = ffi_error(LightClientError::MigrationError(
            MigrationError::IronwoodEraTooYoung {
                retry_after: zcash_protocol::consensus::BlockHeight::from_u32(3_500_000),
            },
        ));
        assert!(
            matches!(
                mapped,
                ZingoError::MigrationIronwoodEraTooYoung {
                    retry_after: 3_500_000,
                    ..
                }
            ),
            "the failure must carry the retry height: {mapped}"
        );
    }

    /// Tests that the detail renders every layer of the cause chain,
    /// outermost first, when the outer layers print no inner text.
    #[test]
    fn the_detail_renders_the_whole_cause_chain() {
        let upstream = LightClientError::SendError(SendError::TransmissionError(
            TransmissionError::TransmissionFailed("node said no".to_string()),
        ));
        assert_eq!(
            detail(&upstream),
            "Send error.: Transmission error.: Transmission failed. node said no"
        );
    }

    /// Tests that the detail renders a layer once when the layer above it
    /// already embeds that layer's text.
    #[test]
    fn the_detail_skips_a_layer_its_parent_already_prints() {
        let upstream =
            LightClientError::WalletError(WalletError::KeyError(KeyError::NetworkMismatch));
        assert_eq!(
            detail(&upstream),
            "Wallet error.: Key error. Decoded unified full viewing key does not match current network"
        );
    }

    /// Tests that a file-layer error keeps only its detail when it crosses
    /// as a `LoadError`.
    #[test]
    fn a_load_error_keeps_the_detail_alone() {
        let mapped = LoadError::from(ZingoError::BirthdayBelowActivation {
            birthday: 1,
            activation: 2,
            detail: "too early".to_string(),
        });
        assert!(
            matches!(mapped, LoadError::Internal { .. }),
            "a fielded cause collapses to Internal on the file path: {mapped}"
        );
    }
}
