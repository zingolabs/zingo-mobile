/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { Platform, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { radiusMd, radiusPill, slopFor, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  AddressKindEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '@app/AppState';
import Utils from '@app/utils';
import { getZingoLogo } from '@app/utils/ZingoAppData';
import Text from '@ui/primitives/Text';
import Banner from '@ui/widgets/Banner';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { CheckCircleLineIcon } from '@ui/primitives/Icons/CheckCircleLineIcon';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';
import { PinIcon } from '@ui/primitives/Icons/PinIcon';
import { addressKindKey } from '@screens/Receive/addressKind';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
/** The QR's light plate, and the code inside its padding. */
const PLATE = 196;
const PLATE_PAD = 12;

/** The pin, green and tilted while the address is pinned. */
export function PinButton({
  pinned,
  onPress,
  testID,
}: {
  pinned: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const tilt = useSharedValue(pinned ? 1 : 0);
  useEffect(() => {
    tilt.value = withSpring(pinned ? 1 : 0, {
      damping: 12,
      stiffness: 220,
      reduceMotion: ReduceMotion.System,
    });
  }, [pinned, tilt]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-30 * tilt.value}deg` }],
  }));
  const color = pinned ? colors.fgPriceUp : colors.fgMuted;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: pinned }}
      accessibilityLabel={
        translate(pinned ? 'receive.unpin-acc' : 'receive.pin-acc') as string
      }
      hitSlop={slopFor(40)}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.bgMutedSubtle : 'transparent',
      })}
    >
      <Animated.View style={style}>
        <PinIcon size={18} color={color} filled={pinned} />
      </Animated.View>
    </Pressable>
  );
}

type AddressCardProps = {
  address: UnifiedAddressClass | TransparentAddressClass;
  /** The tag the user gave it, or ''. */
  tag: string;
  pinned: boolean;
  onTogglePin: () => void;
  onCopy: () => void;
  onVerify: () => void;
  onAddTag: () => void;
};

/**
 * The address Receive shows: its kind, the QR on the light plate with the
 * Zingo logo, the tag (or Add tag), and the address shortened to its first
 * and last ten characters, which copies on a tap. The pin in the corner
 * makes Receive open on it. Copy and Verify sit under the card; a
 * transparent address warns that it is public.
 */
export default function AddressCard({
  address,
  tag,
  pinned,
  onTogglePin,
  onCopy,
  onVerify,
  onAddTag,
}: AddressCardProps) {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  const transparent = address.addressKind === AddressKindEnum.t;
  const kindColor = transparent ? colors.fgWarning : colors.fgPriceUp;

  const action = (
    testID: string,
    label: string,
    icon: React.ReactNode,
    onPress: () => void,
  ) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 41,
        borderRadius: radiusPill,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        backgroundColor: colors.bgCanvas,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: 9,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {icon}
      <Text style={{ fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <View>
      <View
        testID="receive.card"
        style={{
          marginTop: 4,
          paddingTop: 16,
          paddingBottom: 14,
          borderRadius: radiusMd,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          backgroundColor: colors.bgCanvas,
          alignItems: 'center',
        }}
      >
        <View style={{ position: 'absolute', right: 8, top: 8 }}>
          <PinButton
            testID="receive.pin"
            pinned={pinned}
            onPress={onTogglePin}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 6,
            marginBottom: 14,
          }}
        >
          {transparent ? (
            <EyeIcon size={16} color={kindColor} />
          ) : (
            <ShieldIcon size={16} color={kindColor} />
          )}
          <Text
            testID="receive.kind"
            style={{
              fontSize: 13,
              lineHeight: 18,
              fontWeight: '600',
              color: kindColor,
            }}
          >
            {t(addressKindKey(address))}
          </Text>
        </View>
        <View
          style={{
            width: PLATE,
            height: PLATE,
            padding: PLATE_PAD,
            borderRadius: 14,
            backgroundColor: colors.fgDefault,
          }}
        >
          <QRCode
            value={address.address}
            size={PLATE - PLATE_PAD * 2}
            ecl="L"
            backgroundColor={colors.fgDefault}
            logo={getZingoLogo()}
            logoSize={30}
            logoBackgroundColor={colors.fgDefault}
            logoBorderRadius={7}
            logoMargin={3}
          />
        </View>
        {tag ? (
          <Text
            testID="receive.tag"
            numberOfLines={1}
            style={{
              marginTop: 12,
              minHeight: 36,
              lineHeight: 36,
              fontSize: 14,
              fontWeight: '600',
              paddingHorizontal: 16,
            }}
          >
            {tag}
          </Text>
        ) : (
          <Pressable
            testID="receive.add-tag"
            accessibilityRole="button"
            onPress={onAddTag}
            style={({ pressed }) => ({
              marginTop: 12,
              minHeight: 36,
              paddingHorizontal: 14,
              borderRadius: 8,
              justifyContent: 'center',
              backgroundColor: pressed ? colors.bgMutedSubtle : 'transparent',
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                textDecorationLine: 'underline',
                textDecorationColor: colors.fgMuted,
              }}
            >
              {t('receive.add-tag')}
            </Text>
          </Pressable>
        )}
        <Pressable
          testID={
            transparent
              ? 'receive.transparent-address'
              : 'receive.unified-address'
          }
          accessibilityRole="button"
          accessibilityLabel={t('receive.copy-address-button')}
          onPress={onCopy}
          style={({ pressed }) => ({
            marginTop: 6,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: pressed ? colors.bgMutedSubtle : 'transparent',
          })}
        >
          <Text
            style={{
              fontFamily: MONO,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '500',
              letterSpacing: 0.2,
            }}
          >
            {Utils.trimToSmall(address.address, 10)}
          </Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', columnGap: 11, marginTop: 14 }}>
        {action(
          'receive.copy',
          t('receive.copy'),
          <CopyIcon size={16} color={colors.fgDefault} />,
          onCopy,
        )}
        {action(
          'receive.verify',
          t('verify'),
          <CheckCircleLineIcon size={16} color={colors.fgDefault} />,
          onVerify,
        )}
      </View>
      {transparent && (
        <View style={{ marginTop: 14 }}>
          <Banner tone="warning" title={t('receive.transparent-public')} />
        </View>
      )}
    </View>
  );
}
