export type RPCZecPriceType = {
  current_price?: number;
  /**
   * The mixnet tunnel's local SOCKS5 endpoint this fetch traveled through —
   * the per-fetch route attestation riding the data channel. Absent on
   * payloads from native layers that predate the attestation.
   */
  via_socks5?: string;
  error?: string;
};
