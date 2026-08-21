/**
 * Raw DATA-channel payloads of the mixnet FFI functions (`mixnet_indicator`,
 * `attach_mixnet`, `enable_mixnet`, `disable_mixnet`, and
 * `mixnet_bootstrap_detail`). Failures never appear here — they arrive as
 * typed promise rejections on the error channel (zingo-mobile#1151) — so
 * these shapes carry data only. Every field is optional because the
 * payload is untrusted input until a transform validates it.
 */
export type RPCMixnetStatusType = {
  mixnet_indicator?: string;
  socks5_addr?: string;
};

export type RPCMixnetDetailType = {
  detail?: string;
};
