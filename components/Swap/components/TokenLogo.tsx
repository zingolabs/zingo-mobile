/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { TokenEntryType } from '../../../app/swap';
import { ThemeType } from '../../../app/types';
import BoldText from '../../Components/BoldText';

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
  /**
   * Resolved chain badge logo URI. Comes from the `TokenCatalog` (via
   * `SwapService.chainLogoUri(token.chain)`) which derives the URL from
   * each chain's native token in the live `/tokens` response — no URL
   * synthesis in this component. When `undefined` the badge is omitted.
   */
  chainLogoUri?: string;
};

export default function TokenLogo({
  token,
  size,
  surfaceColor,
  forceBadge,
  chainLogoUri,
}: Props) {
  const { colors } = useTheme() as ThemeType;

  // SwapKit's CDN occasionally hosts a `logoURI` pointer to an image that
  // does not actually exist (observed: `strk.xrp-…png` returns 404 even
  // though the response advertises that URL). Fall back to the coin icon
  // when the load fails so the slot never renders empty.
  const [mainLoadFailed, setMainLoadFailed] = useState(false);
  const [badgeLoadFailed, setBadgeLoadFailed] = useState(false);
  useEffect(() => {
    setMainLoadFailed(false);
    setBadgeLoadFailed(false);
  }, [token?.logoURI, chainLogoUri]);

  if (!token) {
    return (
      <LetterAvatar
        letter="?"
        size={size}
        bg={colors.border}
        fg={colors.text}
      />
    );
  }

  const isNative = token.chain === token.symbol;
  // Suppress the badge when it would just duplicate the main image — e.g. on
  // ETH-native L2s (ARB.ETH, OP.ETH, BASE.ETH…) where SwapKit's chain-logo
  // convention (`<chain>.<native>.png`) resolves to the same ETH diamond as
  // the token itself. Adds no info and reads as visual noise.
  const badgeMatchesMain =
    !!chainLogoUri && !!token.logoURI && chainLogoUri === token.logoURI;
  const showBadge = (forceBadge || !isNative) && !badgeMatchesMain;
  const badgeSize = Math.max(10, Math.round(size * 0.42));
  const ring = 2; // thickness of the surface-coloured ring around the badge
  const badgeWrap = badgeSize + ring * 2;
  // How far the badge sticks out past the main image. The ring already
  // adds `ring` px; the extra nudge gives the composition a more "applied"
  // feel without colliding with neighbouring text.
  const badgeOverhang = ring + 2;

  // First letter for the avatar fallback — prefer the clean `ticker`, fall
  // back to whichever short identifier is available. Same approach as
  // Vultisig's `Text(String(ticker.prefix(1)).uppercased())`.
  const avatarLetter = (token.ticker || token.symbol || '?')
    .charAt(0)
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
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <LetterAvatar
          letter={avatarLetter}
          size={size}
          bg={colors.border}
          fg={colors.text}
        />
      )}
      {showBadge && chainLogoUri && !badgeLoadFailed && (
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
            key={chainLogoUri}
            source={{ uri: chainLogoUri }}
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
  letter,
  size,
  bg,
  fg,
}: {
  letter: string;
  size: number;
  bg: string;
  fg: string;
}) {
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
        style={{
          fontSize: Math.round(size * 0.5),
          color: fg,
          lineHeight: size,
          textAlign: 'center',
        }}
      >
        {letter}
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
