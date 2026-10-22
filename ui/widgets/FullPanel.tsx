/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { slopFor, space16, space20, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { useFullSheetSnapPoints } from '@app/hooks/useFullSheetSnapPoints';
import Header from '@ui/widgets/Header';
import AppSheet from '@ui/primitives/AppSheet';
import Text from '@ui/primitives/Text';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { XIcon } from '@ui/primitives/Icons/XIcon';

type FullPanelProps = {
  title: string;
  /** A step back; absent once there is nothing to go back to. */
  onBack?: () => void;
  /** Leaves the flow; absent while leaving would strand a deposit. */
  onClose?: () => void;
  /** Rendered under the content, above the tab bar. */
  footer?: React.ReactNode;
  /** Centres the content vertically, for a result that stands alone. */
  center?: boolean;
  testID?: string;
  children: React.ReactNode;
};

/**
 * The static full panel the redesign opens anything in depth with (a
 * transaction, a review, the swap flow): only the top bar stays above it,
 * the green back arrow and the title head it, the content scrolls and the
 * footer stays put.
 */
export default function FullPanel({
  title,
  onBack,
  onClose,
  footer,
  center,
  testID,
  children,
}: FullPanelProps) {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useFullSheetSnapPoints(containerH, headerH);

  const sheetHeader = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: space16,
      }}
    >
      <View style={{ width: 44, alignItems: 'flex-start' }}>
        {!!onBack && (
          <Pressable
            testID={`${testID ?? 'swap.flow'}.back`}
            accessibilityRole="button"
            accessibilityLabel={translate('swap.back') as string}
            hitSlop={slopFor(24)}
            onPress={onBack}
          >
            <ChevronLeft size={22} color={colors.fgAccent} />
          </Pressable>
        )}
      </View>
      <Text
        variant="subtitle"
        numberOfLines={1}
        style={{ flex: 1, textAlign: 'center' }}
      >
        {title}
      </Text>
      <View style={{ width: 44, alignItems: 'flex-end' }}>
        {!!onClose && (
          <Pressable
            testID={`${testID ?? 'swap.flow'}.close`}
            accessibilityRole="button"
            accessibilityLabel={translate('swap.close') as string}
            hitSlop={slopFor(24)}
            onPress={onClose}
          >
            <XIcon size={22} color={colors.fgDefault} />
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View
            style={{
              paddingHorizontal: space20,
              paddingTop: 10,
              paddingBottom: 30,
              backgroundColor: colors.bgSurface,
            }}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : (
        <></>
      ),
    [footer, colors],
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          noBalance={true}
          noSyncingStatus={true}
          noPrivacy={true}
          noUfvkIcon={true}
          showMessagesIcon={true}
        />
      </View>
      <AppSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        header={sheetHeader}
        renderFooter={footer ? renderFooter : undefined}
      >
        <BottomSheetScrollView
          testID={testID}
          bounces={false}
          alwaysBounceVertical={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: center ? 1 : undefined,
            justifyContent: center ? 'center' : 'flex-start',
            paddingHorizontal: space20,
            paddingTop: 8,
            paddingBottom: footer ? 140 : 60,
          }}
        >
          {children}
        </BottomSheetScrollView>
      </AppSheet>
    </View>
  );
}
