// Fetches zingo-ffi's lib.rs at the commit the Bundle Pin names and fails
// when its `ZingolibError::Mixnet` prefix differs from OWNED_MIXNET_MARKER.
//
// Usage: tsx scripts/check_mixnet_marker.mts

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OWNED_MIXNET_MARKER } from '../app/walletBackend/transforms/sendFailureTransform';
import { PIN } from './fetch_binding_layer.mjs';
import {
  markerState,
  mixnetDisplayPrefix,
  movedMessage,
  pinnedSourceUrl,
} from './mixnet_marker';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { commit } = JSON.parse(readFileSync(join(root, PIN), 'utf8'));
const url = pinnedSourceUrl(commit);
const response = await fetch(url);
if (!response.ok) {
  console.error(`error: ${url} answered ${response.status}`);
  process.exit(1);
}
const state = markerState(
  mixnetDisplayPrefix(await response.text()),
  OWNED_MIXNET_MARKER,
);
if (state.kind === 'moved') {
  console.error(movedMessage(state));
  process.exit(1);
}
