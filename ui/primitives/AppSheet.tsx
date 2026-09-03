import React, { useCallback } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import BottomSheet, {
  BottomSheetFooterProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { radiusSheet, useTheme } from '@app/theme';
import SheetRim from './SheetRim';

type AppSheetProps = {
  snapPoints: (string | number)[];
  index?: number;
  header?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  renderFooter?: (props: BottomSheetFooterProps) => React.ReactElement;
  onChange?: (index: number) => void;
  enableContentPanningGesture?: boolean;
};

const AppSheet = React.forwardRef<BottomSheet, AppSheetProps>(
  (
    {
      snapPoints,
      index = 0,
      header,
      children,
      contentStyle,
      renderFooter,
      onChange,
      enableContentPanningGesture = false,
    },
    ref,
  ) => {
    const { colors } = useTheme();

    const renderHandle = useCallback(
      () => (
        <View style={[styles.handle, { backgroundColor: colors.bgSurface }]}>
          <SheetRim />
          {header}
        </View>
      ),
      [colors, header],
    );

    return (
      <BottomSheet
        ref={ref}
        snapPoints={snapPoints}
        index={index}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={enableContentPanningGesture}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onChange={onChange}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
        handleComponent={renderHandle}
        footerComponent={renderFooter}
      >
        <BottomSheetView style={styles.fill}>
          <View
            style={[
              styles.content,
              { backgroundColor: colors.bgSurface },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

AppSheet.displayName = 'AppSheet';

const styles = StyleSheet.create({
  fill: { flex: 1 },
  handle: {
    minHeight: radiusSheet,
    borderTopLeftRadius: radiusSheet,
    borderTopRightRadius: radiusSheet,
  },
  content: { flex: 1 },
});

export default AppSheet;
