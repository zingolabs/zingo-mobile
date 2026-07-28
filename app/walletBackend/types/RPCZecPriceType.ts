export type RPCZecPriceType = {
  current_price?: number;
  /**
   * The mixnet tunnel's local SOCKS5 endpoint this fetch traveled through —
   * the per-fetch route attestation riding the data channel.
   */
  via_socks5?: string;
  /**
   * True when the fetch deliberately ran over clearnet (Mixnet Mode off by
   * per-session consent). Payloads from native layers that predate the
   * attestation carry neither field.
   */
  via_clearnet?: boolean;
  error?: string;
};
