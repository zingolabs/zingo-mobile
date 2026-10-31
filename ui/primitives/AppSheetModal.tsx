import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetBackgroundProps,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  useBottomSheetInternal,
} from '@gorhom/bottom-sheet';
import { radiusSheet, useTheme, radiusPill, space20 } from '@app/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import { SurfaceContext } from './Surface';
import TooltipHost from '@ui/widgets/TooltipHost';
import { duration, ease } from '@app/theme/motion';

/** Every sheet opens and closes in 420 ms on (.2,0,0,1). */
const SHEET_MOTION = { duration: duration.sheet, easing: ease.emphasized };
import SheetRim from './SheetRim';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';
import { SheetPresence } from './SheetPresence';

/** The measured height of a dynamic sheet's whole body, for its `SheetScrollView`. */
const SheetBodyHeight = createContext<number>(0);

/** What a sheet's `SheetFooter` holds, and the outlet that draws it. */
type FooterStore = { node: React.ReactNode; redraw?: () => void };
const SheetFooterStore = createContext<React.RefObject<FooterStore> | null>(
  null,
);

/**
 * A sheet's actions, pinned at the one bottom distance: the body scrolls
 * above them when it does not fit. Wrap them where they are; they are drawn
 * under the body, outside its scroll. Outside a sheet they draw in place, as they are.
 */
export function SheetFooter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const store = useContext(SheetFooterStore);
  const node = <View style={[styles.footer, style]}>{children}</View>;
  useLayoutEffect(() => {
    if (store?.current) {
      store.current.node = node;
      store.current.redraw?.();
    }
  });
  useLayoutEffect(
    () => () => {
      if (store?.current) {
        store.current.node = null;
        store.current.redraw?.();
      }
    },
    [store],
  );
  return store ? null : <>{children}</>;
}

/** Draws the footer a `SheetFooter` in the body hands over. */
function FooterOutlet({ store }: { store: React.RefObject<FooterStore> }) {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useLayoutEffect(() => {
    const held = store.current;
    held.redraw = redraw;
    redraw();
    return () => {
      held.redraw = undefined;
    };
  }, [store]);
  return <>{store.current.node}</>;
}

type AppSheetModalProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
  /**
   * The content ends at the one bottom distance (useBottomActionPad), above
   * the keyboard too while it is open.
   */
  contentStyle?: StyleProp<ViewStyle>;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
  onChange?: (index: number) => void;
  enablePanDownToClose?: boolean;
  dismissable?: boolean;
  accessible?: boolean;
  renderFooter?: (props: BottomSheetFooterProps) => React.ReactElement;
  /**
   * The body holds its own `SheetScrollView` (a list under a fixed title):
   * the sheet does not wrap it in another.
   */
  ownScroll?: boolean;
  // Shows the grab pill at the top, drawn by the library.
  handle?: boolean;
};

// The sheet's fill with its rim on top, for sheets whose handle sits above the content.
const HandledBackground: React.FunctionComponent<
  BottomSheetBackgroundProps
> = ({ style }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        style,
        {
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        },
      ]}
    >
      <SheetRim />
    </View>
  );
};

const AppSheetModal = React.forwardRef<BottomSheetModal, AppSheetModalProps>(
  (
    {
      header,
      children,
      contentStyle,
      snapPoints,
      onDismiss,
      onChange,
      enablePanDownToClose = true,
      dismissable = true,
      // Defaults off for the same reason AppSheet does: an accessible
      // container collapses its contents out of the iOS accessibility
      // tree. The call sites passing false explicitly predate this.
      accessible = false,
      renderFooter,
      ownScroll = false,
      handle,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const sheet = useRef<BottomSheetModal>(null);
    /**
     * present() waits a frame. A caller sets the sheet's content and
     * presents it in the same press; presented at once, gorhom measured the
     * content before it rendered and, on some phones, left the sheet at that
     * shorter height, its last button below the screen's edge.
     */
    useImperativeHandle(
      ref,
      () =>
        new Proxy({} as BottomSheetModal, {
          get: (_, key: keyof BottomSheetModal) => {
            if (key === 'present') {
              return (...args: Parameters<BottomSheetModal['present']>) =>
                requestAnimationFrame(() => sheet.current?.present(...args));
            }
            const current = sheet.current;
            if (!current) {
              /** Not mounted yet: a call does nothing, as on a null ref. */
              return () => {};
            }
            const value = current[key];
            return typeof value === 'function'
              ? (value as (...a: unknown[]) => unknown).bind(current)
              : value;
          },
        }),
      [],
    );
    const fixed = snapPoints !== undefined;
    const footerStore = useRef<FooterStore>({ node: null });
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const [bodyHeight, setBodyHeight] = useState<number>(0);
    const bottomPad = useBottomActionPad();
    const presence = useContext(SheetPresence);
    const wasOpen = useRef(false);
    /** Reports opening and closing once each, not every snap in between. */
    const changed = (index: number) => {
      const open = index >= 0;
      if (open !== wasOpen.current) {
        wasOpen.current = open;
        presence(open);
      }
      onChange?.(index);
    };

    const body = (
      <>
        <View
          style={[
            fixed ? styles.maskFill : styles.mask,
            {
              backgroundColor: colors.bgSurface,
              paddingBottom: bottomPad,
            },
            contentStyle,
          ]}
        >
          <SurfaceContext.Provider value="surface">
            <SheetFooterStore.Provider value={footerStore}>
              <TooltipHost>
                {header}
                {fixed || ownScroll ? (
                  children
                ) : (
                  <SheetScrollView keyboardShouldPersistTaps="handled">
                    {children}
                  </SheetScrollView>
                )}
                <FooterOutlet store={footerStore} />
              </TooltipHost>
            </SheetFooterStore.Provider>
          </SurfaceContext.Provider>
        </View>
        {!handle && <SheetRim />}
      </>
    );

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissable ? 'close' : 'none'}
        style={{ backgroundColor: colors.bgScrim }}
        opacity={1}
      />
    );

    return (
      <BottomSheetModal
        ref={sheet}
        accessible={accessible}
        enableDynamicSizing={!fixed}
        maxDynamicContentSize={windowHeight - insets.top}
        snapPoints={snapPoints}
        animationConfigs={SHEET_MOTION}
        enablePanDownToClose={enablePanDownToClose}
        stackBehavior="push"
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onAnimate={(from, to) => {
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        onChange={changed}
        onDismiss={onDismiss}
        handleComponent={handle ? undefined : null}
        handleStyle={styles.handle}
        handleIndicatorStyle={[
          styles.indicator,
          { backgroundColor: colors.sheetHandle },
        ]}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
        backgroundComponent={handle ? HandledBackground : undefined}
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
      >
        {fixed ? (
          /** A fixed sheet holds a list: BottomSheetView measures static content and stops a scroll view inside it. */
          <View style={styles.fill}>{body}</View>
        ) : (
          <BottomSheetView
            onLayout={e => setBodyHeight(e.nativeEvent.layout.height)}
          >
            <SheetBodyHeight.Provider value={bodyHeight}>
              {body}
            </SheetBodyHeight.Provider>
          </BottomSheetView>
        )}
      </BottomSheetModal>
    );
  },
);

AppSheetModal.displayName = 'AppSheetModal';

const roundedClip = {
  borderTopLeftRadius: radiusSheet,
  borderTopRightRadius: radiusSheet,
  overflow: 'hidden',
} as const;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { paddingHorizontal: space20 },
  mask: roundedClip,
  maskFill: { flex: 1, ...roundedClip },
  handle: { paddingTop: 10, paddingBottom: 6 },
  indicator: { width: 36, height: 4, borderRadius: radiusPill },
});

export default AppSheetModal;

/**
 * The list of a dynamic `AppSheetModal`, in place of `BottomSheetScrollView`.
 * gorhom takes a scrollable's content height as the sheet's, which leaves out
 * the title above the list and the bottom inset, so the sheet opened short.
 * This one reports its content plus the rest of the body, and is capped at
 * what the screen holds: the sheet opens at its full height and the list
 * scrolls, under a fixed title, only when it does not fit.
 */
export function SheetScrollView({
  children,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  testID?: string;
}) {
  const { animatedLayoutState } = useBottomSheetInternal();
  const bodyHeight = useContext(SheetBodyHeight);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const frame = useRef<number>(0);
  const content = useRef<number>(0);
  const [chrome, setChrome] = useState<number>(0);
  const { edges, fades } = useScrollEdges({ surface: 'surface' });

  /** Runs after gorhom's own report, so the sheet takes this height. */
  const report = useCallback(() => {
    if (!bodyHeight || !frame.current || !content.current) {
      return;
    }
    const rest = Math.max(0, bodyHeight - frame.current);
    setChrome(rest);
    const total = content.current + rest;
    animatedLayoutState.modify(state => {
      'worklet';
      state.contentHeight = total;
      return state;
    });
  }, [animatedLayoutState, bodyHeight]);

  useEffect(report, [report]);

  return (
    <>
      <BottomSheetScrollView
        testID={testID}
        onScroll={edges.onScroll}
        style={[style, { maxHeight: windowHeight - insets.top - chrome }]}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        onLayout={e => {
          edges.onLayout(e);
          frame.current = e.nativeEvent.layout.height;
          report();
        }}
        onContentSizeChange={(w: number, h: number) => {
          edges.onContentSizeChange(w, h);
          content.current = h;
          report();
        }}
      >
        {children}
      </BottomSheetScrollView>
      {fades}
    </>
  );
}
