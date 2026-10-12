/**
 * Result of attempting to switch the active server.
 *
 * - `ok`: the server was changed (or did not need to change). The settings
 *   file and React state are now in sync with the new URI / selectServer
 *   mode. The caller can navigate forward as normal.
 *
 * - `chain-changed`: the new server runs on a different chain than the
 *   open wallet, so the existing seed/UFVK can't be used as-is. The old
 *   server is restored and `newServer` / `newSelectServer` are stashed
 *   in state so the recovery screen (Seed or Ufvk with
 *   `action: server`) can finish the migration. The caller MUST navigate
 *   to that recovery screen. `setServerOption` does not navigate, so the
 *   navigation policy lives entirely in the call site.
 *
 * - `error`: a transient failure (RPC/network/JSON parse). The old server
 *   is restored and the user stays where they are. The caller surfaces
 *   `message` via a snackbar and lets the user retry. No navigation, no
 *   restart: an RPC blip must not send the user to the recovery screen.
 */
export type SetServerResult =
  | { kind: 'ok' }
  | { kind: 'chain-changed' }
  | { kind: 'error'; message: string };
