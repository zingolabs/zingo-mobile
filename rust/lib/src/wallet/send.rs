//! Proposing and confirming sends and shields.

use std::sync::Arc;

use zcash_address::ZcashAddress;
use zcash_client_backend::proposal::Proposal;
use zcash_protocol::memo::MemoBytes;
use zcash_protocol::value::Zatoshis;
use zingolib::data::proposal::total_fee;
use zingolib::data::receivers::{Receivers, transaction_request_from_receivers};
use zingolib::lightclient::error::SendError;
use zip32::AccountId;

use super::Wallet;
use crate::error::{ZingoError, ffi_error};
use crate::types::{Pool, Receiver, SendProposal, ShieldProposal};

fn memo_bytes(memo: &str) -> Result<MemoBytes, ZingoError> {
    let bytes = match memo.strip_prefix("0x").or_else(|| memo.strip_prefix("0X")) {
        Some(hex_text) => hex::decode(hex_text).unwrap_or_else(|_| memo.as_bytes().to_vec()),
        None => memo.as_bytes().to_vec(),
    };
    MemoBytes::from_bytes(&bytes).map_err(|_| ZingoError::input("the memo is too long"))
}

fn push_pool(pools: &mut Vec<Pool>, pool: Pool) {
    if !pools.contains(&pool) {
        pools.push(pool);
    }
}

fn source_pools<FeeRuleT, NoteRef>(proposal: &Proposal<FeeRuleT, NoteRef>) -> Vec<Pool> {
    let mut pools = Vec::new();
    for step in proposal.steps() {
        if !step.transparent_inputs().is_empty() {
            push_pool(&mut pools, Pool::Transparent);
        }
        if let Some(inputs) = step.shielded_inputs() {
            for note in inputs.notes() {
                push_pool(&mut pools, Pool::from(note.note().pool()));
            }
        }
    }
    pools
}

fn destination_pools<FeeRuleT, NoteRef>(proposal: &Proposal<FeeRuleT, NoteRef>) -> Vec<Pool> {
    let mut pools = Vec::new();
    for step in proposal.steps() {
        for pool in step.payment_pools().values() {
            push_pool(&mut pools, Pool::from(*pool));
        }
    }
    pools
}

#[uniffi::export(async_runtime = "tokio")]
impl Wallet {
    /// Builds and stores a send proposal for the user's consent.
    pub async fn propose_send(
        self: Arc<Self>,
        receivers: Vec<Receiver>,
    ) -> Result<SendProposal, ZingoError> {
        self.run("propose_send", move |w| async move {
            let mut list = Receivers::new();
            for receiver in receivers {
                let recipient_address = ZcashAddress::try_from_encoded(&receiver.address)
                    .map_err(|e| ZingoError::input(format!("invalid address: {e}")))?;
                let amount = Zatoshis::from_u64(receiver.amount)
                    .map_err(|e| ZingoError::input(format!("invalid amount: {e}")))?;
                let memo = receiver.memo.as_deref().map(memo_bytes).transpose()?;
                list.push(zingolib::data::receivers::Receiver {
                    recipient_address,
                    amount,
                    memo,
                });
            }
            let request = transaction_request_from_receivers(list)
                .map_err(|e| ZingoError::input(format!("request error: {e}")))?;
            let mut client = w.client_write().await?;
            let proposal = client
                .propose_send(request, AccountId::ZERO)
                .await
                .map_err(|e| ffi_error(SendError::from(e).into()))?;
            let fee = total_fee(&proposal).map_err(ZingoError::internal)?;
            Ok(SendProposal {
                fee: fee.into_u64(),
                source_pools: source_pools(&proposal),
                destination_pools: destination_pools(&proposal),
            })
        })
        .await
    }

    /// Builds and stores a proposal that shields every transparent coin.
    pub async fn propose_shield(self: Arc<Self>) -> Result<ShieldProposal, ZingoError> {
        self.run("propose_shield", move |w| async move {
            let mut client = w.client_write().await?;
            let proposal = client
                .propose_shield(AccountId::ZERO)
                .await
                .map_err(|e| ffi_error(SendError::from(e).into()))?;
            if proposal.steps().len() != 1 {
                return Err(ZingoError::Internal {
                    detail: "a shielding proposal has more than one step".to_string(),
                });
            }
            let step = proposal.steps().first();
            let value_to_shield = step
                .balance()
                .proposed_change()
                .iter()
                .try_fold(Zatoshis::ZERO, |acc, c| acc + c.value())
                .ok_or_else(|| ZingoError::Internal {
                    detail: "shield amount outside the valid range of zatoshis".to_string(),
                })?;
            Ok(ShieldProposal {
                value_to_shield: value_to_shield.into_u64(),
                fee: step.balance().fee_required().into_u64(),
            })
        })
        .await
    }

    /// Signs and transmits the stored proposal, returning its txids.
    pub async fn confirm(self: Arc<Self>) -> Result<Vec<String>, ZingoError> {
        self.run("confirm", move |w| async move {
            let mut client = w.client_write().await?;
            let txids = client.send_stored_proposal(true).await.map_err(ffi_error)?;
            Ok(txids.iter().map(|txid| txid.to_string()).collect())
        })
        .await
    }
}
