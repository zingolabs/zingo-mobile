// Reads the display prefix of `ZingolibError::Mixnet` out of zingolib's FFI
// source and compares it with the marker the send classifier owns. The
// check:mixnet-marker script enters here with the source at the Bundle Pin.

const MIXNET_VARIANT =
  /#\[error\("([^"]*?) \{0\}"\)\]\s*\n\s*Mixnet\(String\),/;

export const OWNER = 'app/walletBackend/transforms/sendFailureTransform.ts';

export type MixnetPrefix =
  | { readonly kind: 'prefix'; readonly prefix: string }
  | { readonly kind: 'absent' };

export type MarkerState =
  | { readonly kind: 'held'; readonly prefix: string }
  | {
      readonly kind: 'moved';
      readonly pinned: MixnetPrefix;
      readonly owned: string;
    };

export function mixnetDisplayPrefix(source: string): MixnetPrefix {
  const attribute = MIXNET_VARIANT.exec(source);
  return attribute === null
    ? { kind: 'absent' }
    : { kind: 'prefix', prefix: attribute[1] };
}

export function markerState(pinned: MixnetPrefix, owned: string): MarkerState {
  return pinned.kind === 'prefix' && pinned.prefix === owned
    ? { kind: 'held', prefix: owned }
    : { kind: 'moved', pinned, owned };
}

export function movedMessage({
  pinned,
  owned,
}: Extract<MarkerState, { kind: 'moved' }>): string {
  const displayed =
    pinned.kind === 'prefix' ? `"${pinned.prefix}"` : 'no Mixnet variant';
  return (
    `error: the pinned zingolib displays ZingolibError::Mixnet as ` +
    `${displayed} and ${OWNER} owns "${owned}". Move the marker with the pin.`
  );
}

export function pinnedSourceUrl(commit: string): string {
  return `https://raw.githubusercontent.com/zingolabs/zingolib/${commit}/zingo-ffi/lib/src/lib.rs`;
}
