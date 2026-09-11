// Raw data payloads of the mixnet FFI calls; every field is untrusted until a transform validates it.
export type RPCMixnetStatusType = {
  mixnet_indicator?: string;
  socks5_addr?: string;
};

export type RPCMixnetDetailType = {
  detail?: string;
};
