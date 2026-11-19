/**
 * Result of attempting to switch the active server.
 *
 * - `ok`: the server was changed (or did not need to change). The settings
 *   file and React state are now in sync with the new URI / selectServer
 *   mode. The caller can navigate forward as normal.
 *
 * The new server is always on the wallet's own network: a wallet's network
 * never changes.
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
  { kind: 'ok' } | { kind: 'error'; message: string };
