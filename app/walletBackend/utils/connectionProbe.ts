/**
 * The effectful half of the Connection Doctor's probe surface: the one
 * native call. The typed outcome union and its pure interpreter live in
 * serverProbeOutcome.ts, which imports no native surface, so everything
 * downstream of interpretation loads without the React Native runtime.
 */
import RPCModule from '../../RPCModule';
import { callFfi, decodeFfiJson, FfiJsonDecode } from '../ffi';

// A user-invoked diagnostic: the clearnet leg contacts the target from the
// real IP. Never call it on an automatic path.
export async function probeServer(uri: string): Promise<FfiJsonDecode> {
  return decodeFfiJson(await callFfi(RPCModule.probeServerProcess(uri)));
}

// The staged sync-path probe: tcp-connect, tls-channel, grpc-info, each
// timed, stopping at the first typed failure. Same user-invoked-only rule.
export async function probeSyncServer(uri: string): Promise<FfiJsonDecode> {
  return decodeFfiJson(await callFfi(RPCModule.probeSyncServerProcess(uri)));
}
