/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { CardRect } from '@app/types';
import { SnowflakeIcon } from '@ui/primitives/Icons/SnowflakeIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';

const CARD_BORDER = '#13355F';
const TILE_BG = '#0A1B33';
const BUTTON_BORDER = '#1D4C7F';
const BUTTON_INK = '#BFD6F5';
const BODY_INK = '#8DA0B8';

type ViewOnlyNoticeProps = {
  onViewKey: (from: CardRect) => void;
  onDismiss: () => void;
};

// The view-only card on History. View key grows it into the viewing key
// screen; the X removes it for this wallet.
const ViewOnlyNotice: React.FunctionComponent<ViewOnlyNoticeProps> = ({
  onViewKey,
  onDismiss,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const card = useRef<View>(null);

  const open = () =>
    card.current?.measureInWindow((x, y, width, height) =>
      onViewKey({ x, y, width, height }),
    );

  return (
    <View
      ref={card}
      testID="viewonly.notice"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 13,
        paddingRight: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        backgroundColor: colors.bgSurface,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: TILE_BG,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SnowflakeIcon size={16} color={colors.fgViewOnly} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.fgDefault,
            fontSize: 14,
            fontWeight: '700',
            marginBottom: 4,
          }}
        >
          {translate('viewonly.title') as string}
        </Text>
        <Text style={{ color: BODY_INK, fontSize: 12.5, lineHeight: 17 }}>
          {translate('viewonly.body') as string}
        </Text>
      </View>
      <Pressable
        testID="viewonly.viewkey"
        accessibilityRole="button"
        onPress={open}
        style={({ pressed }) => ({
          marginTop: 27,
          height: 28,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: BUTTON_BORDER,
          backgroundColor: TILE_BG,
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <Text style={{ color: BUTTON_INK, fontSize: 12.5, fontWeight: '700' }}>
          {translate('viewonly.button') as string}
        </Text>
      </Pressable>
      <Pressable
        testID="viewonly.dismiss"
        accessibilityRole="button"
        accessibilityLabel={translate('viewonly.dismiss-acc') as string}
        onPress={onDismiss}
        style={({ pressed }) => ({
          position: 'absolute',
          top: 4,
          right: 5,
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? 'rgba(211,226,248,0.08)' : undefined,
        })}
      >
        <XIcon size={14} color={colors.fgMuted} strokeWidth={2} />
      </Pressable>
    </View>
  );
};

export default ViewOnlyNotice;
