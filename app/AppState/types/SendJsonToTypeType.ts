export default interface SendJsonToTypeType {
  address: string;
  amount: number;
  memo?: string;
  /**
   * Optional hex-encoded payload for a transparent OP_RETURN output.
   *
   * Although the JSON contract is an array of receivers, OP_RETURN is a
   * transaction-wide concern (one OP_RETURN per tx). The Rust side reads this
   * field only from the first entry and applies it to the proposal. Used by
   * the swap deposit flow (Maya memos); ordinary sends omit it.
   */
  op_return?: string;
  /**
   * Optional flag that forces a transparent recipient through the ZIP-320
   * ephemeral indirection (shielded → wallet ephemeral t-addr → recipient).
   *
   * Like `op_return`, this is a transaction-wide concern read only from the
   * first entry. Used by the swap deposit flow for Mayachain / THORChain
   * deposits: those providers derive the refund destination from the inbound
   * tx's `from_address`, which is unobservable when the funds originate from
   * a shielded note. Routing via an ephemeral t-addr gives the protocol a
   * wallet-controlled `from_address` to refund to. Defaults to `false`.
   */
  route_via_ephemeral?: boolean;
}
