/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '@react-navigation/native';

import BoldText from '../Components/BoldText';
import FadeText from '../Components/FadeText';
import RegText from '../Components/RegText';
import { ThemeType } from '../../app/types';

import { MenuMorphIcon } from '../Components/Icons/MenuMorphIcon';
import XSocial from '../../assets/img/options/x.svg';
import Github from '../../assets/img/options/github.svg';
import Mail from '../../assets/img/options/mail.svg';
import Refresh from '../../assets/img/options/refresh.svg';

export type OptionsPanelAction = {
  /** Unique key for the action (typically a MenuItemEnum value). */
  id: string;
  /** Localized label rendered under the icon. */
  label: string;
  /** Pre-rendered icon component. Caller controls colour / size. */
  icon: React.ReactNode;
  onPress: () => void;
  /** Greys out the cell and disables onPress. */
  disabled?: boolean;
  /** testID for the action cell. Matches the legacy `menu.*` slugs used by
   *  Maestro flows and detox helpers. */
  testID?: string;
};

/**
 * Socials are tapped in one of two ways:
 *  - copy-url: clipboard write + URL is shown as a caption below the row.
 *    The user is expected to paste it wherever they want — no in-app open.
 *  - callback: free-form action (used for mail to invoke the device's
 *    native mail composer via the existing sendEmail helper).
 */
export type OptionsPanelSocial =
  { id: 'x' | 'github'; url: string } | { id: 'mail'; onPress: () => void };

export type OptionsPanelProps = {
  /** Localized "Options" heading. */
  title: string;
  actions: OptionsPanelAction[];
  socials?: OptionsPanelSocial[];
  /** Fired after a social URL (x/github) is placed on the clipboard, so
   *  the host can show a snackbar. Not fired for `mail` (no copy). */
  onLinkCopied?: (url: string) => void;
  /**
   * Mode pill at the bottom. Shows the wallet brand + the mode that will
   * become active when tapped (so the user reads the destination, mirroring
   * the legacy drawer's switch). `logoColor` tints the rounded background
   * behind the logo image when present.
   */
  mode?: {
    walletName: string;
    targetModeLabel: string;
    targetModeColor: string;
    logoSource: ImageSourcePropType;
    onToggle: () => void;
  };
  /** Triggered by the triple-chevron close button at top-left. */
  onClose: () => void;
};

/**
 * Static visual of the Options panel. Renders behind the active screen
 * when the user opens the panel (see `useOptionsPanel`). Pure props-driven
 * so it can be tested in isolation; wiring lives in the consumer.
 */
const OptionsPanel: React.FC<OptionsPanelProps> = ({
  title,
  actions,
  socials,
  onLinkCopied,
  mode,
  onClose,
}) => {
  const { colors } = useTheme() as ThemeType;
  // Caption under the social row — set when the user taps X / GitHub so
  // they can read (and re-copy) the URL just placed on the clipboard.
  // Cleared when a different social with no URL is tapped (e.g. mail).
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleSocialPress = useCallback(
    async (social: OptionsPanelSocial) => {
      if (social.id === 'mail') {
        setCopiedUrl(null);
        social.onPress();
        return;
      }
      // Copy to clipboard + reveal the URL caption (so the user can review or re-copy).
      Clipboard.setString(social.url);
      setCopiedUrl(social.url);
      onLinkCopied?.(social.url);
      // Also open the URL in the device's browser. Same pattern used by the
      // block-explorer link in the transaction detail screen.
      const supported = await Linking.canOpenURL(social.url);
      if (supported) {
        await Linking.openURL(social.url);
      } else {
        console.log('Cannot open social URL');
      }
    },
    [onLinkCopied],
  );

  const tripleChevron = useMemo(
    () => (
      <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
        <View
          style={{
            width: 25,
            height: 25,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MenuMorphIcon />
        </View>
      </Pressable>
    ),
    [onClose],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        {tripleChevron}
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <BoldText style={{ fontSize: 18 }}>{title}</BoldText>
        </View>
        {/* Spacer matches the chevron column width so the title centers. */}
        <View style={{ width: 27 }} />
      </View>

      {/* Grid of actions — 4 columns */}
      <ScrollView
        contentContainerStyle={{
          paddingTop: 28,
          paddingHorizontal: 8,
          paddingBottom: 24,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          {actions.map(action => (
            <Pressable
              key={action.id}
              testID={action.testID}
              onPress={action.disabled ? undefined : action.onPress}
              style={({ pressed }) => ({
                width: '25%',
                alignItems: 'center',
                paddingVertical: 12,
                opacity: action.disabled ? 0.35 : pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: '#111c2c',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                }}
              >
                {action.icon}
              </View>
              <RegText
                numberOfLines={2}
                style={{
                  fontSize: 12,
                  textAlign: 'center',
                  paddingHorizontal: 4,
                }}
              >
                {action.label}
              </RegText>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Footer: socials + mode pill */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        {/* Caption: URL copied to clipboard. Rendered ABOVE the social row
            so the Android snackbar (anchored to the bottom of the screen)
            cannot occlude it. Selectable so the user can also grab the URL
            manually if the clipboard write failed silently. */}
        {!!copiedUrl && (
          <View
            style={{ paddingTop: 16, paddingBottom: 4, alignItems: 'center' }}
          >
            <FadeText style={{ fontSize: 12, textAlign: 'center' }} selectable>
              {copiedUrl}
            </FadeText>
          </View>
        )}

        {socials && socials.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 28,
              paddingTop: 16,
              paddingBottom: 20,
            }}
          >
            {socials.map(social => (
              <Pressable
                key={social.id}
                onPress={() => handleSocialPress(social)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                {/* Sizes are proportional to each SVG's viewBox
                    (X 30 / Github 37 / Mail 35) so the glyphs render at
                    a comparable visual weight instead of all collapsing
                    to the same pixel box. */}
                {social.id === 'x' && <XSocial width={22} height={22} />}
                {social.id === 'github' && <Github width={27} height={27} />}
                {social.id === 'mail' && <Mail width={29} height={29} />}
              </Pressable>
            ))}
          </View>
        )}

        {mode && (
          // Only the name + mode label + refresh icon are tappable; the
          // logo image on the left is purely decorative. Wrapping the
          // logo and the Pressable inside one bordered View keeps the
          // visual pill intact.
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.zingo,
              borderRadius: 10,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Image
              source={mode.logoSource}
              style={{
                width: 32,
                height: 32,
                resizeMode: 'contain',
                borderRadius: 7,
                marginRight: 12,
              }}
            />
            <Pressable
              onPress={mode.onToggle}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  flex: 1,
                  fontWeight: 'bold',
                  fontSize: 16,
                  color: colors.text,
                }}
              >
                {mode.walletName + '   '}
                <Text
                  style={{
                    color: mode.targetModeColor,
                    fontWeight: 'bold',
                    fontSize: 14,
                  }}
                >
                  {mode.targetModeLabel}
                </Text>
              </Text>
              <Refresh width={18} height={18} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

export default React.memo(OptionsPanel);
