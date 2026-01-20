import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { LifeHash, LifeHashVersion } from 'lifehash';

export function lifehashDataUrlFromStringSync(input: string) {
  const digest = sha256(utf8ToBytes(input)); // Uint8Array(32)
  const img = LifeHash.makeFromDigest(
    digest,
    LifeHashVersion.version2,
    1,
    true,
  );
  return img.toDataUrl();
}
