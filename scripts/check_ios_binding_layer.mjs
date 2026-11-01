#!/usr/bin/env node
// Compares the extracted iOS Prebuilt Bundle with the Bundle Pin and fails
// naming the fetch when they differ. The Zingo target runs it as its first
// build phase, before Xcode plans the package build, so a pin move is
// reported in the build that follows it instead of compiling the old
// package.
//
// Usage: node scripts/check_ios_binding_layer.mjs

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import {
  MARKER,
  PACKAGE,
  placement,
} from 'zingolib-bundle-pin/lib/swift_package.mjs';
import { IOS_STORE, PIN } from './fetch_binding_layer.mjs';

const FETCH = 'yarn --silent fetch:binding-layer --platform ios';

export function iosBundleState(pin, marker, manifestPresent) {
  const pinned = pin.digests.ios;
  return placement(marker, pinned, manifestPresent) === 'held'
    ? { kind: 'held', digest: pinned }
    : { kind: 'stale', pinned, held: marker };
}

export function staleMessage({ pinned, held }) {
  return (
    `error: ${IOS_STORE} holds ${held ?? 'no bundle'} and ${PIN} pins ` +
    `${pinned}. Run ${FETCH}.`
  );
}

function textOf(path) {
  return existsSync(path) ? readFileSync(path, 'utf8').trim() : undefined;
}

if (basename(process.argv[1] ?? '') === 'check_ios_binding_layer.mjs') {
  const root = resolve(dirname(process.argv[1]), '..');
  const store = join(root, IOS_STORE);
  const state = iosBundleState(
    JSON.parse(readFileSync(join(root, PIN), 'utf8')),
    textOf(join(store, MARKER)),
    existsSync(join(store, PACKAGE, 'Package.swift')),
  );
  if (state.kind === 'stale') {
    console.error(staleMessage(state));
    process.exit(1);
  }
}
