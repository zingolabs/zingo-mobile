/**
 * Result of attempting to switch the active server.
 *
 * - `ok`: the server was changed (or did not need to change). The settings
 *   file and React state are now in sync with the new URI / selectServer
 *   mode. The caller can navigate forward as normal.
 *
 * - `chain-changed`: the new server runs on a different chain than the
 *   open wallet, so the existing seed/UFVK can't be used as-is. The old
 *   server has been restored and `newServer` / `newSelectServer` were
 *   stashed in state so the recovery screen (Seed or Ufvk with
 *   `action: server`) can finish the migration. The caller MUST navigate
 *   to that recovery screen — `setServerOption` no longer does it
 *   internally so the navigation policy lives entirely in the call site.
 *
 * - `error`: a transient failure (RPC/network/JSON parse). The old server
 *   has been restored; the user stays where they are. The caller should
 *   surface `message` via a snackbar and let the user retry. No
 *   navigation, no "restart" — the previous heavy-handed behaviour of
 *   sending the user to the recovery screen for any RPC blip was the
 *   source of the Settings "save sometimes works, sometimes doesn't"
 *   reports.
 */
export type SetServerResult =
  | { kind: 'ok' }
  | { kind: 'chain-changed' }
  | { kind: 'error'; message: string };
