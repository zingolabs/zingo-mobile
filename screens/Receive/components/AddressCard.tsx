/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { duration, ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import {
  iconSizeMd,
  iconSizeSm,
  radiusMd,
  radiusPill,
  space8,
  space12,
  space16,
  touchTarget,
  useTheme,
  slopFor,
  space4,
  radiusSm,
} from '@app/theme';
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
import Card from '@ui/widgets/Card';
import Button from '@ui/primitives/Button';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { CheckCircleLineIcon } from '@ui/primitives/Icons/CheckCircleLineIcon';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';
import { PinIcon } from '@ui/primitives/Icons/PinIcon';
import { addressKindKey } from '@screens/Receive/addressKind';

/** The QR at the size the app always draws it, on its light plate. */
const QR_SIZE = 200;
/** A line of text in the card, about 20 high; its slop grows it to 44. */
const LINE_H = 20;

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
    tilt.value = withTiming(pinned ? 1 : 0, {
      duration: duration.emphasized,
      easing: ease.spring,
      reduceMotion: ReduceMotion.System,
    });
  }, [pinned, tilt]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-30 * tilt.value}deg` }],
  }));
  const color = pinned ? colors.fgAccent : colors.fgMuted;
  return (
    <Pressable
      kind="icon"
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: pinned }}
      accessibilityLabel={
        translate(pinned ? 'receive.unpin-acc' : 'receive.pin-acc') as string
      }

      onPress={onPress}
      style={{
        width: touchTarget,
        height: touchTarget,
        borderRadius: radiusPill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={style}>
        <PinIcon size={iconSizeMd} color={color} filled={pinned} />
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
  /** Only the icon carries the pool's colour; its name reads in the text colour. */
  const kindColor = transparent ? colors.fgTransparent : colors.fgAccent;

  return (
    <View style={{ gap: space16 }}>
      <View testID="receive.card">
        <Card>
          <View style={{ alignItems: 'center', gap: space12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space8,
              }}
            >
              {transparent ? (
                <EyeIcon size={iconSizeSm} color={kindColor} />
              ) : (
                <ShieldIcon size={iconSizeSm} color={kindColor} />
              )}
              <Text
                testID="receive.kind"
                variant="bodySmall"
                style={{ fontWeight: '600' }}
              >
                {t(addressKindKey(address))}
              </Text>
            </View>
            <View
              style={{
                padding: space12,
                borderRadius: radiusMd,
                backgroundColor: colors.bgQrPaper,
              }}
            >
              <QRCode
                value={address.address}
                size={QR_SIZE}
                ecl="L"
                color={colors.fgQrInk}
                backgroundColor={colors.bgQrPaper}
                logo={getZingoLogo()}
                logoSize={30}
                logoBackgroundColor={colors.bgQrPaper}
                logoBorderRadius={radiusSm}
                logoMargin={3}
              />
            </View>
            {/* The tag and the address read as one group, 4 apart; each keeps a 44 pt tap area through its slop. */}
            <View style={{ alignItems: 'center', gap: space4 }}>
              {tag ? (
                <Text
                  testID="receive.tag"
                  variant="bodyStrong"
                  numberOfLines={1}
                >
                  {tag}
                </Text>
              ) : (
                <Pressable
                  kind="link"
                  testID="receive.add-tag"
                  accessibilityRole="button"
                  onPress={onAddTag}
                  hitSlop={slopFor(LINE_H)}
                >
                  <Text variant="caption" style={{ fontWeight: '700' }}>
                    {t('receive.add-tag')}
                  </Text>
                </Pressable>
              )}
              <Pressable
                kind="link"
                testID={
                  transparent
                    ? 'receive.transparent-address'
                    : 'receive.unified-address'
                }
                accessibilityRole="button"
                accessibilityLabel={t('receive.copy-address-button')}
                onPress={onCopy}
                hitSlop={slopFor(LINE_H)}
              >
                <Text variant="address">
                  {Utils.trimToSmall(address.address, 10)}
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={{ position: 'absolute', right: space8, top: space8 }}>
            <PinButton
              testID="receive.pin"
              pinned={pinned}
              onPress={onTogglePin}
            />
          </View>
        </Card>
      </View>
      <View style={{ flexDirection: 'row', gap: space12 }}>
        <View style={{ flex: 1 }}>
          <Button
            testID="receive.copy"
            variant="secondary"
            icon={CopyIcon}
            title={t('receive.copy')}
            onPress={onCopy}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            testID="receive.verify"
            variant="secondary"
            icon={CheckCircleLineIcon}
            title={t('verify')}
            onPress={onVerify}
          />
        </View>
      </View>
      {transparent && (
        <Banner tone="warning" title={t('receive.transparent-public')} />
      )}
    </View>
  );
}
