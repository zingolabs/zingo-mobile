/**
 * Raw JSON payloads of the mixnet FFI functions (`mixnet_mode`,
 * `attach_mixnet`, `enable_mixnet`, `disable_mixnet`, and
 * `mixnet_bootstrap_detail`). Every field is optional because the payload
 * is untrusted input until a transform validates it.
 */
export type RPCMixnetStatusType = {
  mixnet_mode?: string;
  socks5_addr?: string;
  error?: string;
};

export type RPCMixnetDetailType = {
  detail?: string;
  error?: string;
};
