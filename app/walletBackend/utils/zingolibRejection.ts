/**
 * Decodes the ZingolibError variant from a bridge rejection.
 *
 * The native bridges reject with the FFI's name as the code and the
 * typed ZingolibError as the underlying error (zingo-mobile#1151). By
 * the time React Native surfaces the rejection to JS, the variant
 * survives only in the message: Android carries the Rust Display
 * rendering verbatim, and iOS carries String(describing:) of the Swift
 * enum case wrapping that same rendering. Each variant's Display opens
 * with a stable, mutually non-prefixing marker (rust/lib/src/lib.rs,
 * ZingolibError), so those two renderings are the decoding contract.
 * This decodes the one wire format a typed error crosses in — it never
 * inspects a resolved value, so the success channel stays unclassified.
 */

export enum ZingolibErrorVariant {
  LightclientNotInitialized = 'LightclientNotInitialized',
  LightclientLockPoisoned = 'LightclientLockPoisoned',
  Panic = 'Panic',
  Save = 'Save',
  Init = 'Init',
  Sync = 'Sync',
  Rescan = 'Rescan',
  Read = 'Read',
  Drain = 'Drain',
  Unknown = 'Unknown',
}

type KnownVariant = Exclude<ZingolibErrorVariant, ZingolibErrorVariant.Unknown>;

// Each variant's Rust Display prefix, verbatim from the #[error(...)]
// attributes in rust/lib/src/lib.rs. The record is total over the known
// variants, so adding a variant without its marker fails to compile.
const displayMarker: Record<KnownVariant, string> = {
  [ZingolibErrorVariant.LightclientNotInitialized]:
    'Error: Lightclient is not initialized',
  [ZingolibErrorVariant.LightclientLockPoisoned]:
    'Error: Lightclient lock poisoned',
  [ZingolibErrorVariant.Panic]: 'Error: panic:',
  [ZingolibErrorVariant.Save]: 'Error: saving wallet:',
  [ZingolibErrorVariant.Init]: 'Error: initializing wallet:',
  [ZingolibErrorVariant.Sync]: 'Error: sync:',
  [ZingolibErrorVariant.Rescan]: 'Error: rescan:',
  [ZingolibErrorVariant.Read]: 'Error: read:',
  [ZingolibErrorVariant.Drain]: 'Error: draining orchard to ironwood:',
};

export function decodeZingolibErrorVariant(
  rejection: unknown,
): ZingolibErrorVariant {
  const message =
    rejection instanceof Error
      ? rejection.message
      : typeof rejection === 'string'
        ? rejection
        : '';

  // The iOS shape leads with the Swift case name: `Read(message: "...")`.
  const swiftCase = message.match(/^([A-Za-z]+)\(message:/);
  if (swiftCase && swiftCase[1] in displayMarker) {
    return swiftCase[1] as ZingolibErrorVariant;
  }

  // The Android shape is the Rust Display rendering itself.
  for (const [variant, marker] of Object.entries(displayMarker)) {
    if (message.startsWith(marker)) {
      return variant as ZingolibErrorVariant;
    }
  }

  return ZingolibErrorVariant.Unknown;
}

// Whether each variant signals a broken client that restarting the sync
// coordinator could help. The transient variants mean the client itself
// is healthy — a server dial failed, a sync pass errored — and the next
// polling tick retries them for free, so a restart would only add
// teardown churn (an offline device hits one of these every five
// seconds). Unknown keeps the conservative pre-decoding behavior. The
// record is total over the enum, so adding a variant without deciding
// its escalation fails to compile.
const brokenClientVariant: Record<ZingolibErrorVariant, boolean> = {
  [ZingolibErrorVariant.LightclientNotInitialized]: true,
  [ZingolibErrorVariant.LightclientLockPoisoned]: true,
  [ZingolibErrorVariant.Panic]: true,
  [ZingolibErrorVariant.Save]: true,
  [ZingolibErrorVariant.Init]: true,
  [ZingolibErrorVariant.Sync]: false,
  [ZingolibErrorVariant.Rescan]: false,
  [ZingolibErrorVariant.Read]: false,
  [ZingolibErrorVariant.Drain]: false,
  [ZingolibErrorVariant.Unknown]: true,
};

export function isBrokenClientRejection(rejection: unknown): boolean {
  return brokenClientVariant[decodeZingolibErrorVariant(rejection)];
}
