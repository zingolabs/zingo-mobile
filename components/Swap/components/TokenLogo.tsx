/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { TokenEntryType } from '../../../app/swap';
import BoldText from '../../Components/BoldText';
import { getChainIcon } from './chainIcons';

/**
 * Composed asset icon: the token's logo as the main image, with a small
 * badge in the bottom-right corner that shows the chain logo (only when the
 * token is not the chain's native token, i.e. `chain !== symbol`).
 *
 * The badge sits over a thin ring whose colour matches the surrounding
 * `surfaceColor`, so visually it looks "punched" out of the main image —
 * borrowing the standard cross-chain wallet convention.
 *
 * SwapKit hosts native chain logos at the same CDN as token logos, following
 * the convention `images/<chain>.<chain>.png` (lowercase). We derive the URL
 * from `token.chain`; if the request 404s the badge image fails silently and
 * we draw the empty ring (still better than no chain hint at all).
 */
type Props = {
  token: TokenEntryType | null | undefined;
  /** Diameter of the main (token) image in pixels. */
  size: number;
  /**
   * Background colour of whatever surface the icon sits on. Drives the ring
   * around the chain badge so the badge stands out against the main image.
   */
  surfaceColor: string;
  /**
   * Render the chain badge even when the token is the chain's native asset
   * (i.e. `chain === symbol`). Used to keep the chip visual identical
   * between ZEC and any non-ZEC asset on the Swap screen so the two sides
   * of the swap look balanced.
   */
  forceBadge?: boolean;
};

export default function TokenLogo({
  token,
  size,
  surfaceColor,
  forceBadge,
}: Props) {
  // SwapKit's CDN occasionally hosts a `logoURI` pointer to an image that
  // does not actually exist (observed: `strk.xrp-…png` returns 404 even
  // though the response advertises that URL). Fall back to the coin icon
  // when the load fails so the slot never renders empty.
  const [mainLoadFailed, setMainLoadFailed] = useState(false);
  const [badgeLoadFailed, setBadgeLoadFailed] = useState(false);
  useEffect(() => {
    setMainLoadFailed(false);
    setBadgeLoadFailed(false);
  }, [token?.logoURI]);

  if (!token) {
    return <LetterAvatar label="?" size={size} bg="#E8E8E8" fg="#040C17" />;
  }

  const isNative = token.chain === token.symbol;
  // The chain badge is a bundled per-chain icon (see `chainIcons.ts`), keyed by
  // `token.chain`. Shown for non-native assets (a token sitting on a chain);
  // suppressed for a chain's own native asset, where the main image already IS
  // the chain — unless `forceBadge` asks for it (keeps the swap chips balanced).
  const chainIcon = getChainIcon(token.chain);
  const showBadge = (forceBadge || !isNative) && !!chainIcon;
  const badgeSize = Math.max(10, Math.round(size * 0.42));
  const ring = 2; // thickness of the surface-coloured ring around the badge
  const badgeWrap = badgeSize + ring * 2;
  // How far the badge sticks out past the main image. The ring already
  // adds `ring` px; the extra nudge gives the composition a more "applied"
  // feel without colliding with neighbouring text.
  const badgeOverhang = ring + 2;

  // Up to the first three characters for the avatar fallback — prefer the
  // clean `ticker`, fall back to whichever short identifier is available. Three
  // letters read as a mini-ticker (BTC, SOL, USD…) and fill the circle better
  // than a single glyph.
  const avatarLabel = (token.ticker || token.symbol || '?')
    .slice(0, 3)
    .toUpperCase();

  return (
    <View style={{ width: size, height: size, overflow: 'visible' }}>
      {token.logoURI && !mainLoadFailed ? (
        <Image
          // Force a fresh mount when the URI first becomes available or
          // changes. iOS RN's `<Image>` occasionally fails to trigger
          // the network fetch when the `source` prop transitions from
          // undefined (e.g. token=null → renders LetterAvatar) to a
          // real URI on the same node — the Image sticks on its empty
          // state until forcibly remounted. Keying by URI sidesteps
          // this by handing React a distinct element for each URI.
          key={token.logoURI}
          source={{ uri: token.logoURI }}
          onError={() => setMainLoadFailed(true)}
          resizeMode="cover"
          // Light-grey canvas behind the logo. Many token PNGs are a dark/mono
          // glyph on a transparent background (e.g. NEAR-bridged assets), which
          // vanished against the dark sheet. Token logos are authored for light
          // surfaces, so a light neutral is the safe default; fully-opaque logos
          // (USDT's green disc, etc.) simply cover it and look unchanged.
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#E8E8E8',
          }}
        />
      ) : (
        <LetterAvatar
          label={avatarLabel}
          size={size}
          bg="#E8E8E8"
          fg="#040C17"
        />
      )}
      {showBadge && !badgeLoadFailed && (
        <View
          style={{
            position: 'absolute',
            right: -badgeOverhang,
            bottom: -badgeOverhang,
            width: badgeWrap,
            height: badgeWrap,
            borderRadius: badgeWrap / 2,
            backgroundColor: surfaceColor,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
          }}
        >
          <Image
            source={chainIcon}
            onError={() => setBadgeLoadFailed(true)}
            resizeMode="cover"
            style={{
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
            }}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Letter-avatar fallback used when the upstream image URL is missing or
 * fails to load. Matches the pattern used by Vultisig (the other open-source
 * mobile wallet consuming SwapKit), which is visually clearer than a
 * generic coin icon — the user can tell at a glance which token it is.
 */
function LetterAvatar({
  label,
  size,
  bg,
  fg,
}: {
  label: string;
  size: number;
  bg: string;
  fg: string;
}) {
  // Shrink the font as the label grows so up to three characters fit inside the
  // circle without clipping. Centering is handled by the container's
  // align/justify, so no explicit lineHeight (which would offset shorter text).
  const fontScale = label.length >= 3 ? 0.3 : label.length === 2 ? 0.4 : 0.5;
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <BoldText
        numberOfLines={1}
        style={{
          fontSize: Math.round(size * fontScale),
          color: fg,
          textAlign: 'center',
        }}
      >
        {label}
      </BoldText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
