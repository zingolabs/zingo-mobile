// One timed leg of a paired connectivity probe, as the FFI renders it.
// `detail` is the upstream leg's collapsed prose (a chain-and-height summary
// on success, the failure text otherwise); it gains typed fields when
// zingolib's net-diag taxonomy lands (Workstream B), and nothing here may
// parse it to make decisions.
export type RPCProbeLegType = {
  ok: boolean;
  detail: string;
  millis: number;
};

// One target's paired probe. The clearnet leg always runs; `mixnet` is null
// when the proxy was not ready to carry the second leg.
export type RPCProbeReportType = {
  host: string;
  clearnet: RPCProbeLegType;
  mixnet: RPCProbeLegType | null;
};
