/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { radiusSm, space8, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';

export type TagTone =
  | 'neutral'
  | 'accent'
  | 'warning'
  | 'danger'
  | 'viewOnly'
  | 'orchard'
  | 'sapling'
  | 'ironwood'
  | 'transparent';

type TagProps = {
  /** One or two words, sentence case. A tag always carries a word. */
  children: string;
  tone?: TagTone;
  testID?: string;
};

/** A short status label that is read, not tapped. For a filter, use `Chip`. */
const Tag: React.FunctionComponent<TagProps> = ({
  children,
  tone = 'neutral',
  testID,
}) => {
  const { colors } = useTheme();
  const paint = {
    neutral: { fg: colors.fgMuted, bg: colors.bgMutedSubtle },
    accent: { fg: colors.fgAccent, bg: colors.bgAccentSubtle },
    warning: { fg: colors.fgWarning, bg: colors.bgWarningSubtle },
    danger: { fg: colors.fgDanger, bg: colors.bgDangerSubtle },
    viewOnly: { fg: colors.fgViewOnly, bg: colors.bgViewOnlySubtle },
    orchard: {
      fg: colors.fgOrchard,
      bg: colors.bgOrchard,
      edge: colors.borderOrchard,
    },
    sapling: {
      fg: colors.fgSapling,
      bg: colors.bgSapling,
      edge: colors.borderSapling,
    },
    ironwood: {
      fg: colors.fgIronwood,
      bg: colors.bgIronwood,
      edge: colors.borderIronwood,
    },
    transparent: { fg: colors.fgTransparent, bg: colors.bgTransparent },
  }[tone];
  const edge = 'edge' in paint ? paint.edge : undefined;
  return (
    <View
      testID={testID}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: paint.bg,
        borderRadius: radiusSm,
        paddingHorizontal: space8,
        paddingVertical: 2,
        ...(edge ? { borderWidth: 1, borderColor: edge } : {}),
      }}
    >
      <Text variant="caption" color={paint.fg} style={{ fontWeight: '600' }}>
        {children}
      </Text>
    </View>
  );
};

export default Tag;
