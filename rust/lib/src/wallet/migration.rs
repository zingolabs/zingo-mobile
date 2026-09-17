//! The Orchard to Ironwood migration: the Drain, and the private path's splitting and Sending.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use zingolib::wallet::migration::{
    MigrationParams, parts::PartState, parts::SigningStrategy, split::plan_hash,
};
use zip32::AccountId;

use super::Wallet;
use crate::error::{ZingoError, ffi_error};
use crate::types::{
    BatchReport, BatchStatus, DrainPlan, DrainReport, DrainStatus, JobKind, MigrationPlan,
    MigrationStatus, ReconcileAction, SplitOutcome, SplitRound, SplitStatus, SplitStep,
    SplitTransaction, WalletEvent, WindowReport,
};

fn hash32_to_hex(hash: &[u8; 32]) -> String {
    hash.iter().map(|b| format!("{b:02x}")).collect()
}

fn hex_to_hash32(hex_text: &str) -> Option<[u8; 32]> {
    hex::decode(hex_text).ok()?.try_into().ok()
}

#[uniffi::export(async_runtime = "tokio")]
impl Wallet {
    /// Plans the Drain without signing or sending anything.
    pub async fn plan_drain(self: Arc<Self>) -> Result<DrainPlan, ZingoError> {
        self.run("plan_drain", move |w| async move {
            let client = w.client_read().await?;
            client
                .plan_immediate_migration(AccountId::ZERO)
                .await
                .map(DrainPlan::from)
                .map_err(ffi_error)
        })
        .await
    }

    /// Runs the Drain to completion, publishing `DrainProgress` on the way.
    pub async fn drain(self: Arc<Self>) -> Result<DrainReport, ZingoError> {
        self.run("drain", move |w| async move {
            let _job = w.begin_job(JobKind::Drain)?;
            let mut client = w.client_for_job().await?;
            let handle = client.immediate_migration_progress_handle();
            let _progress = w.watch_progress(
                move || handle.status().map(DrainStatus::from),
                |status| WalletEvent::DrainProgress { status },
            );
            client
                .quick_immediate_migration(AccountId::ZERO, true)
                .await
                .map(DrainReport::from)
                .map_err(ffi_error)
        })
        .await
    }

    /// Plans the private migration without signing or sending anything.
    pub async fn plan_migration(self: Arc<Self>) -> Result<MigrationPlan, ZingoError> {
        self.run("plan_migration", move |w| async move {
            let client = w.client_read().await?;
            let plan = client
                .plan_ironwood_migration(AccountId::ZERO)
                .await
                .map_err(ffi_error)?;
            let params = MigrationParams::provisional(w.data().read().await.chain_type());
            Ok(MigrationPlan {
                split_rounds: plan
                    .split_rounds
                    .iter()
                    .map(|round| SplitRound {
                        transactions: round.iter().map(SplitTransaction::from_upstream).collect(),
                    })
                    .collect(),
                parts: plan.parts.clone(),
                split_fee: plan.split_fee(),
                parts_fee: plan.parts_fee(&params),
                residual: plan.residual,
                plan_hash: hash32_to_hex(&plan_hash(&plan)),
            })
        })
        .await
    }

    /// Records consent to the plan named by `plan_hash` and persists the migration state.
    pub async fn start_migration(
        self: Arc<Self>,
        plan_hash: String,
        per_bucket: Option<u32>,
    ) -> Result<(), ZingoError> {
        self.run("start_migration", move |w| async move {
            let hash =
                hex_to_hash32(&plan_hash).ok_or_else(|| ZingoError::input("invalid plan hash"))?;
            let mut client = w.client_write().await?;
            client
                .start_ironwood_migration(
                    AccountId::ZERO,
                    SigningStrategy::LazyAtBoundary,
                    hash,
                    per_bucket,
                )
                .await
                .map_err(ffi_error)
        })
        .await
    }

    /// Runs one round of Note splitting, publishing `SplitProgress` on the way.
    pub async fn split_round(self: Arc<Self>) -> Result<SplitOutcome, ZingoError> {
        self.run("split_round", move |w| async move {
            let _job = w.begin_job(JobKind::SplitRound)?;
            let mut client = w.client_for_job().await?;
            let handle = client.split_progress_handle();
            let _progress = w.watch_progress(
                move || handle.status().map(SplitStatus::from),
                |status| WalletEvent::SplitProgress { status },
            );
            client
                .quick_split(AccountId::ZERO, true)
                .await
                .map(SplitOutcome::from)
                .map_err(ffi_error)
        })
        .await
    }

    /// Drives one step of the consented migration's Note splitting.
    pub async fn continue_note_splitting(self: Arc<Self>) -> Result<SplitStep, ZingoError> {
        self.run("continue_note_splitting", move |w| async move {
            let _job = w.begin_job(JobKind::NoteSplitting)?;
            let mut client = w.client_for_job().await?;
            client
                .continue_note_splitting()
                .await
                .map(SplitStep::from)
                .map_err(ffi_error)
        })
        .await
    }

    /// Sets the Cadence and re-buckets every unsent part.
    pub async fn reschedule_parts(self: Arc<Self>, per_bucket: u32) -> Result<(), ZingoError> {
        self.run("reschedule_parts", move |w| async move {
            let mut client = w.client_write().await?;
            client.reschedule_parts(per_bucket).await.map_err(ffi_error)
        })
        .await
    }

    /// The migration's progress, arranged for direct rendering.
    pub async fn migration_status(self: Arc<Self>) -> Result<MigrationStatus, ZingoError> {
        self.run("migration_status", move |w| async move {
            let client = w.client_read().await?;
            let status = client.migration_status().await.map_err(ffi_error)?;
            let data = w.data().read().await;
            let (denominations, per_bucket, bucket_modulus, parts_broadcast) = match &data.migration
            {
                Some(state) => (
                    state
                        .parts
                        .iter()
                        .map(|part| (part.id.0, part.denomination))
                        .collect::<HashMap<_, _>>(),
                    Some(state.params.k_max),
                    state.params.bucket_modulus,
                    state
                        .parts
                        .iter()
                        .filter(|part| matches!(part.state, PartState::Broadcast))
                        .count() as u32,
                ),
                None => (
                    HashMap::new(),
                    None,
                    MigrationParams::provisional(data.chain_type()).bucket_modulus,
                    0,
                ),
            };
            Ok(MigrationStatus::from_upstream(
                status,
                &denominations,
                per_bucket,
                bucket_modulus,
                parts_broadcast,
            ))
        })
        .await
    }

    /// The Window calendar, or `None` before the wallet has ever synced.
    pub async fn window_timeline(self: Arc<Self>) -> Result<Option<Vec<WindowReport>>, ZingoError> {
        self.run("window_timeline", move |w| async move {
            let client = w.client_read().await?;
            let timeline = client.window_timeline().await.map_err(ffi_error)?;
            Ok(timeline.map(|windows| windows.iter().map(WindowReport::from_upstream).collect()))
        })
        .await
    }

    /// Classifies every part against the local chain view and applies what is safe unattended.
    pub async fn reconcile_migration(self: Arc<Self>) -> Result<Vec<ReconcileAction>, ZingoError> {
        self.run("reconcile_migration", move |w| async move {
            let _job = w.begin_job(JobKind::Reconcile)?;
            let mut client = w.client_for_job().await?;
            let report = client.reconcile_migration().await.map_err(ffi_error)?;
            Ok(report
                .actions
                .iter()
                .map(ReconcileAction::from_upstream)
                .collect())
        })
        .await
    }

    /// Sends the Batch owed right now, `spacing_ms` apart, publishing `BatchProgress` on the way.
    pub async fn execute_due_parts(
        self: Arc<Self>,
        spacing_ms: u64,
    ) -> Result<BatchReport, ZingoError> {
        self.run("execute_due_parts", move |w| async move {
            let _job = w.begin_job(JobKind::Batch)?;
            let mut client = w.client_for_job().await?;
            let handle = client.batch_progress_handle();
            let _progress = w.watch_progress(
                move || handle.status().map(BatchStatus::from),
                |status| WalletEvent::BatchProgress { status },
            );
            client
                .execute_due_parts(Duration::from_millis(spacing_ms))
                .await
                .map(BatchReport::from)
                .map_err(ffi_error)
        })
        .await
    }

    /// Abandons the migration in progress: confirmed parts stand, pending ones release their notes.
    pub async fn cancel_migration(self: Arc<Self>) -> Result<(), ZingoError> {
        self.run("cancel_migration", move |w| async move {
            let mut client = w.client_write().await?;
            client.cancel_ironwood_migration().await.map_err(ffi_error)
        })
        .await
    }
}
