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
import { ArrowLeftIcon } from '@ui/primitives/Icons/ArrowLeftIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';

type SwapFlowScreenProps = {
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
 * One screen of the swap flow: the plain header, a sheet with its title and
 * optional back and close, scrolling content and a fixed footer. The same
 * scaffold Confirm uses, so a swap reads like a send.
 */
export default function SwapFlowScreen({
  title,
  onBack,
  onClose,
  footer,
  center,
  testID,
  children,
}: SwapFlowScreenProps) {
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
            <ArrowLeftIcon size={22} color={colors.fgDefault} />
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
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
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
