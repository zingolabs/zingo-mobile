/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils';
import { ChainLogo } from '@ui/widgets/ChainSelect';
import { WalletIcon } from '@ui/primitives/Icons/WalletIcon';

const INK_SOFT = '#8DA0B8';
const INK_CODE = '#B9C6D6';
const PUBLIC_INK = '#E6C46A';
const PUBLIC_BG = 'rgba(230,196,106,0.12)';
const CURRENT_INK = '#3CC52A';
const CURRENT_BG = 'rgba(60,197,42,0.12)';
const WALLET_INK = '#8FB4E6';
const WALLET_BG = 'rgba(143,180,230,0.14)';
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

export type RowAvatar =
  { kind: 'initial'; color: string; ticker: string } | { kind: 'wallet' };

export type RowTag = 'none' | 'public' | 'current';

type AddressRowHeadProps = {
  testID: string;
  name: string;
  /** The chain ticker beside the name; a wallet address has none. */
  ticker: string;
  address: string;
  avatar: RowAvatar;
  tag: RowTag;
  expanded: 'none' | 'open' | 'closed';
  onPress: () => void;
};

// The visible part of an address book row: avatar, name, short address and its tag.
const AddressRowHead: React.FunctionComponent<AddressRowHeadProps> = ({
  testID,
  name,
  ticker,
  address,
  avatar,
  tag,
  expanded,
  onPress,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const tagLook =
    tag === 'public'
      ? { ink: PUBLIC_INK, bg: PUBLIC_BG, key: 'addressbook.public' }
      : { ink: CURRENT_INK, bg: CURRENT_BG, key: 'addressbook.in-use' };

  return (
    <Pressable
      testID={`${testID}.head`}
      accessibilityRole="button"
      accessibilityState={
        expanded === 'none' ? undefined : { expanded: expanded === 'open' }
      }
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 62,
        paddingVertical: 8,
        paddingHorizontal: 13,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor:
            avatar.kind === 'initial' ? `${avatar.color}29` : WALLET_BG,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {avatar.kind === 'initial' ? (
          <>
            <Text
              style={{
                color: avatar.color,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              {name.slice(0, 1).toUpperCase()}
            </Text>
            <View
              style={{
                position: 'absolute',
                right: -5,
                bottom: -5,
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: colors.bgSurface,
                backgroundColor: colors.bgSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChainLogo chain={avatar.ticker} size={18} />
            </View>
          </>
        ) : (
          <WalletIcon size={18} color={WALLET_INK} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              color: colors.fgDefault,
              fontSize: 13.5,
              lineHeight: 18,
              fontWeight: '600',
            }}
          >
            {name}
          </Text>
          {!!ticker && (
            <Text
              style={{
                marginLeft: 8,
                color: INK_SOFT,
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.5,
              }}
            >
              {ticker}
            </Text>
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            marginTop: 2,
          }}
        >
          <Text
            style={{
              color: INK_CODE,
              fontFamily: MONO,
              fontSize: 11.5,
              fontWeight: '500',
            }}
          >
            {Utils.trimToSmall(address, 7)}
          </Text>
          {tag !== 'none' && (
            <Text
              testID={`${testID}.${tag}`}
              style={{
                color: tagLook.ink,
                backgroundColor: tagLook.bg,
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.4,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 5,
                overflow: 'hidden',
              }}
            >
              {(translate(tagLook.key) as string).toUpperCase()}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default AddressRowHead;
