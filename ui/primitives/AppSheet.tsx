import React, { createContext, useContext } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import BottomSheet, { BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { radiusSheet, useTheme } from '@app/theme';
import { SurfaceContext } from './Surface';
import TooltipHost from '@ui/widgets/TooltipHost';
import { duration, ease } from '@app/theme/motion';

/** The panel moves between its stops like every sheet: 420 ms, (.2,0,0,1). */
const SHEET_MOTION = { duration: duration.sheet, easing: ease.emphasized };
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
  /** Its own rise and fall; a full panel moves at the panel's pace. */
  animationConfigs?: { duration: number; easing: typeof ease.emphasized };
  /** False to appear at its snap at once, for a step inside a panel. */
  animateOnMount?: boolean;
  // The sheet container is an accessibility element by default, which on
  // iOS collapses everything inside it into a single node: the content is
  // simply not in the accessibility tree any more. Off unless a caller has
  // a reason to want the sheet announced as one thing.
  accessible?: boolean;
};

// The handle takes the header through context: the sheet treats
// handleComponent as a component type, so a new one per render would
// remount the handle, and the rim would blink while it measures again.
const SheetHeader = createContext<React.ReactNode>(null);

const SheetHandle: React.FunctionComponent = () => {
  const { colors } = useTheme();
  const header = useContext(SheetHeader);
  return (
    <View style={[styles.handle, { backgroundColor: colors.bgSurface }]}>
      <SheetRim />
      {header}
    </View>
  );
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
      accessible = false,
      animationConfigs = SHEET_MOTION,
      animateOnMount = true,
    },
    ref,
  ) => {
    const { colors } = useTheme();

    return (
      <SheetHeader.Provider value={header}>
        <BottomSheet
          ref={ref}
          snapPoints={snapPoints}
          index={index}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          enableContentPanningGesture={enableContentPanningGesture}
          accessible={accessible}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          onChange={onChange}
          backgroundStyle={{
            backgroundColor: colors.bgSurface,
            borderTopLeftRadius: radiusSheet,
            borderTopRightRadius: radiusSheet,
          }}
          handleComponent={SheetHandle}
          animationConfigs={animationConfigs}
          animateOnMount={animateOnMount}
          footerComponent={renderFooter}
        >
          <View
            style={[
              styles.content,
              { backgroundColor: colors.bgSurface },
              contentStyle,
            ]}
          >
            <SurfaceContext.Provider value="surface">
              <TooltipHost>{children}</TooltipHost>
            </SurfaceContext.Provider>
          </View>
        </BottomSheet>
      </SheetHeader.Provider>
    );
  },
);

AppSheet.displayName = 'AppSheet';

const styles = StyleSheet.create({
  handle: {
    minHeight: radiusSheet,
    borderTopLeftRadius: radiusSheet,
    borderTopRightRadius: radiusSheet,
  },
  content: { height: '100%' },
});

export default AppSheet;
