/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import type { TokenEntryType } from '@app/swap';
import Text from '@ui/primitives/Text';
import Utils from '@app/utils';
import { getChainIcon } from '@ui/widgets/chainIcons';
import { isDarkLogo } from './darkLogos';
import { useTheme } from '@app/theme';

type TokenLogoProps = {
  token: TokenEntryType | null | undefined;
  /** Diameter of the token image. */
  size: number;
  /** The surface the logo sits on, which rings the chain badge. */
  surfaceColor: string;
  /** Badge the chain even on its native asset, so both swap chips match. */
  forceBadge?: boolean;
};

/**
 * The token's logo with the chain's badge in the corner, the convention
 * cross-chain wallets share. The badge sits on a ring in the surface colour,
 * so it reads as punched out of the logo. A logo the CDN does not serve
 * falls back to a lettered disc coloured from the ticker.
 */
export default function TokenLogo({
  token,
  size,
  surfaceColor,
  forceBadge,
}: TokenLogoProps) {
  const { colors } = useTheme();
  // A light canvas behind the few near-black marks that vanish on the sheet.
  const darkLogoBackdrop = colors.bgQrPaper;
  const [mainLoadFailed, setMainLoadFailed] = useState(false);
  const [badgeLoadFailed, setBadgeLoadFailed] = useState(false);
  useEffect(() => {
    setMainLoadFailed(false);
    setBadgeLoadFailed(false);
  }, [token?.logoURI]);

  if (!token) {
    return (
      <LetterAvatar
        label="?"
        size={size}
        bg={darkLogoBackdrop}
        fg={Utils.getLabelColor(darkLogoBackdrop)}
      />
    );
  }
  const isNative = token.chain === token.symbol;
  const chainIcon = getChainIcon(token.chain);
  const showBadge = (forceBadge || !isNative) && !!chainIcon;
  const badgeSize = Math.max(10, Math.round(size * 0.42));
  const ring = 2;
  const badgeWrap = badgeSize + ring * 2;
  const badgeOverhang = ring + 2;
  const avatarLabel = (token.ticker || token.symbol || '?')
    .slice(0, 3)
    .toUpperCase();
  const seed = token.ticker || token.symbol || '?';
  const avatarBg = Utils.generateColorFromSeed(seed);
  const avatarFg = Utils.getLabelColor(avatarBg);
  const imageBg = isDarkLogo(token) ? darkLogoBackdrop : 'transparent';
  const bundledMain = isNative ? chainIcon : undefined;
  const mainSource =
    token.logoURI && !mainLoadFailed ? { uri: token.logoURI } : bundledMain;

  return (
    <View style={{ width: size, height: size, overflow: 'visible' }}>
      {mainSource ? (
        <Image
          key={token.logoURI ?? token.identifier}
          source={mainSource}
          onError={() => setMainLoadFailed(true)}
          resizeMode="cover"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: imageBg,
          }}
        />
      ) : (
        <LetterAvatar
          label={avatarLabel}
          size={size}
          bg={avatarBg}
          fg={avatarFg}
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
  const fontScale = label.length >= 3 ? 0.3 : label.length === 2 ? 0.4 : 0.5;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Text
        variant="bodyStrong"
        color={fg}
        numberOfLines={1}
        style={{ fontSize: Math.round(size * fontScale), textAlign: 'center' }}
      >
        {label}
      </Text>
    </View>
  );
}
